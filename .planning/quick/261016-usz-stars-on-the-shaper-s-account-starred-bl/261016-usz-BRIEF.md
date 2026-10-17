# Brief — quick 261016-usz: stars on the shaper's account (sketch 015 B, part 2 of 2)

Written by the orchestrator for the planner, 2026-10-16. "Decided" is locked.

## Where this came from

Part 1 (quick 261015-ve9 plus fast 163–167) is LIVE on www.shaperassistant.com (main 0d77fa37). It shipped ROCKER's
PICK A BLANK popup with ☆ stars kept in the browser only:
- `lib/starred-blanks-preference.ts`: localStorage key `shaper-starred-blanks`; a JSON list of `[maker, name]` pairs in
  starring order; the allow-list parser; a cap of 500; `withStar`; `starredBlanksJson`.
- `components/starred-blanks-provider.tsx`: `useSyncExternalStore` over localStorage, mounted in `app/layout.tsx`, built
  so part 2 only adds the account hand-off.

The founder's decision (2026-10-15, after the recommendation): **signed in, stars are saved on the shaper's account and
follow them to any device; signed out, the browser remembers them, like the Imperial/Metric choice.** Then (2026-10-16):
"go ahead with part 2, stars on my account".

## Decided

1. **Where:** a new nullable `text` column `starred_blanks` on `user_preferences`, holding `starredBlanksJson`'s JSON.
   This is exactly how `hidden_blank_makers` (migration 0007) and `rack_order` (0009) are stored. The migration is
   additive: the next number, made with `npm run db:generate -- --name starred_blanks < /dev/null`.
2. **Signed out:** nothing changes from part 1. Stars live in this browser only.
3. **Signed in:** the account is where stars live.
   - The server reads the account's list (one guarded read beside the others the root layout already does — see
     `lib/blank-makers-server.ts` for the try/catch that degrades to "no account value" when the column doesn't exist
     yet or the database fails) and hands it to `StarredBlanksProvider`.
   - Every star and unstar shows at once (the browser copy), then saves to the account through a server action in
     order, last write wins (see `components/blank-makers-provider.tsx`'s write queue and
     `lib/preference-handoff.ts`).
4. **Nothing a shaper starred is ever lost, and a star removed on one device stays removed on the others.** Concretely:
   - Stars made in a browser while signed out are JOINED into the account the next time the shaper signs in there.
     The order is the account's stars first, then the browser-only ones after.
   - The joined list is written back to the account.
   - Otherwise, on a signed-in load the account's list REPLACES the browser copy. So unstarring on the phone is not
     undone by the computer's older browser copy.
   - The browser therefore needs to know which of its stars have not yet been joined into an account: e.g. a small
     second localStorage flag, set when a star changes while signed out and cleared after the join. Planner's choice;
     it must be pure and tested in `lib/`.
   - When a different shaper signs in on the same browser, the first shaper's synced stars must NOT leak into the
     second's account. Only stars made while signed out are joined.
5. **No cookie.** The list renders in the browser, and a long star list would outgrow a cookie's size limit.
6. **The server action** (`app/actions/…`, mirroring `app/actions/blank-makers.ts`):
   - It needs a signed-in user. Signed out, it writes nothing and returns quietly.
   - It runs every value through the existing allow-list parser (strings only, the catalogue's text limits, at most 500,
     duplicates dropped).
   - It upserts only `starred_blanks` and `updated_at`.
7. **Starring never changes a board** or marks it unsaved (unchanged from part 1).
8. **The read-only proof script** `scripts/check-preference-columns.ts` learns the new column (6 of 6 `user_preferences`
   columns; its header comment, the printed line, the counts and the exit rule all updated). That is what proves each
   database has it.
9. **If `/privacy` or `/terms` lists what a shaper's account stores** (look at `app/privacy` and `app/terms`), add the
   starred blanks to that list in the same plain words. If neither lists account settings item by item, change nothing.

## Database order (CLAUDE.md "Database"; additive)

- **Development branch:** the executor migrates it during the work, from its own worktree, with the recipe that works
  inside a worktree:
  - `MIGRATE_ENV_FILE=/Users/kontoes/Code/shaper/.env.local npx --no-install drizzle-kit migrate`, run in the worktree
    (`drizzle.config.ts` loads that file itself).
  - Then the proof: `CHECK_ENV_FILE=/Users/kontoes/Code/shaper/.env.local npx --no-install tsx scripts/check-preference-columns.ts`.
  - Run migrate twice, then prove. Drizzle prints "applied successfully" even when it applied nothing, so only the
    check script proves it.
- **Production is NOT the executor's.** The orchestrator runs `npm run db:migrate:prod` and the check with the founder
  present, BEFORE the code is pushed to main. Drizzle names every column on each insert into `user_preferences`, so a
  deploy that knew `starred_blanks` before production had it would break the Imperial/Metric, fit-defaults, makers and
  rack-order saves.

## House rules

- CLAUDE.md:
  - **Rule 1:** the merge rule is pure and tested in `lib/`.
  - **The preference pattern:** units, fit defaults, blank makers and rack order each have a `lib/*-preference.ts`, a
    `lib/*-server.ts`, an action and a provider — follow it.
  - **Database section:** additive changes migrate production first.
- e2e runs signed out with fake Clerk keys and no database (`playwright.config.ts`). Signed-in behaviour is proven with
  unit tests: the merge rule, the action's validation and auth, and the handoff decision. The signed-out e2e behaviour
  must stay as part 1 shipped it.
- Gates in a worktree:
  - `npx next typegen`, then `npx tsc --noEmit`, `npm test`, `npm run lint`.
  - Playwright with `IS_WEBPACK_TEST=1 PW_PORT=<free port ≥ 3191>`.
  - `npm run build` can't run in a worktree, but `npx next build --webpack` with playwright.config's fake env can.
  - The 6 `components/design/slider-row.test.ts` failures happen only in a worktree.
- Commit subjects in plain English for a shaper, ending with `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>`.
  The founder is they/them.

## Not in this task

- Production migration (orchestrator + founder).
- Any change to what the popup shows or how stars look.
