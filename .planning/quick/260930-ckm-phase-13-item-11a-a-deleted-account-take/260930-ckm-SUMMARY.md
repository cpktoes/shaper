---
phase: quick-260930-ckm
plan: 01
subsystem: account-deletion
tags: [clerk, webhook, drizzle, privacy]
status: complete
dependency-graph:
  requires: [lib/db/schema.ts, lib/db/client.ts, proxy.ts]
  provides: [lib/clerk-webhook.ts, lib/db/account-deletion.ts, app/api/webhooks/clerk/route.ts]
  affects: [lib/auth/open-access.test.ts]
tech-stack:
  added: []
  patterns:
    - "Standard Webhooks (Svix) HMAC verification via @clerk/nextjs/webhooks, injected as a dependency so the core is testable with fakes"
    - "drizzle-orm neon-http db.batch for an atomic multi-table delete (no db.transaction — unsupported on this driver)"
    - "Schema scan (is()/getTableConfig) that fails a test the moment a new clerk_user_id-owned table isn't added to the deletion"
key-files:
  created:
    - lib/clerk-webhook.ts
    - lib/clerk-webhook.test.ts
    - lib/clerk-webhook-test-signing.ts
    - lib/db/account-deletion.ts
    - lib/db/account-deletion.test.ts
    - app/api/webhooks/clerk/route.ts
    - lib/clerk-webhook-route.test.ts
    - e2e/clerk-webhook.spec.ts
  modified:
    - lib/auth/open-access.test.ts
decisions:
  - "Created lib/clerk-webhook-test-signing.ts (not in the plan's files_modified list, but explicitly anticipated by the plan's own text) as a shared, keyless Standard-Webhooks-v1 signing helper, used by both lib/clerk-webhook.test.ts (behavior 8) and lib/clerk-webhook-route.test.ts (R1-R6) instead of duplicating the recipe"
  - "@clerk/nextjs/webhooks types verifyWebhook's request parameter as NextRequest-only (RequestLike), narrower than what its own implementation actually accepts (it detects a plain Web Request via isRequestWebAPI() and passes it straight through to @clerk/backend's verifyWebhook unchanged, proven by reading node_modules/@clerk/nextjs/dist/cjs/webhooks.js at execution time) — bridged with one small, well-commented type-only cast in app/api/webhooks/clerk/route.ts and the two test files that call verifyWebhook directly, rather than switching the import source away from the plan's pinned @clerk/nextjs/webhooks"
metrics:
  duration: ~45min
  completed: 2026-09-30
actuals:
  tokens: 9850
  tasks: 2
  commits: 2
---

# Phase 13 Plan 11a: A deleted account takes its boards and settings with it Summary

When a shaper deletes their own Clerk account — or the founder deletes one from Clerk's dashboard — Clerk now sends a signed message to the app, and the app removes every board that account saved and its settings row, atomically, and tells Clerk back only how many rows it removed.

## What was built

- **`lib/clerk-webhook.ts`** — the pure-ish core. Takes a `Request` and a small bag of injected dependencies (verify, deleteAccountData, log, whether a signing secret is even configured) and returns a plain-text `Response`. No signing secret set → 400. Verification fails for any reason (no signature, tampered body, wrong secret, stale timestamp) → 400, same bland body either way. A `user.deleted` event with a usable id → deletes and answers 200 with the two counts. Any other event, or a `user.deleted` with no usable id → 200, acknowledged and ignored. A database failure → 500, so Clerk retries. Nothing identifying (the shaper's Clerk id, an email, a thrown error's own message) is ever logged or returned — proven test by test, because Drizzle's own query errors carry the id in their message.
- **`lib/db/account-deletion.ts`** — the atomic delete. Two owner-scoped deletes (one on `models`, one on `user_preferences`) run through Drizzle's `db.batch`, which Neon's HTTP driver turns into one HTTP call and one real Postgres transaction — so a board is never left behind with its settings gone, or the reverse. A schema scan in its test file fails the moment a future table carrying a `clerk_user_id` column is added without joining this deletion; the blanks catalogue (no owner column at all) is never touched.
- **`app/api/webhooks/clerk/route.ts`** — the address Clerk actually calls: `POST` only, no other HTTP method exported, no sign-in check anywhere on the path (D-01 — Clerk's own server is never signed in, so an `auth()` gate would refuse every real delivery). Clerk's HMAC signature is the only lock.
- Tests: 13 behaviors on the injected-fakes core (including five real-signature cases built with `node:crypto`, no new package), 5 behaviors on the atomic delete, 8 behaviors proving the real route end to end with `db.batch` spied (not a real database call), 3 new lines in the open-access test confirming the route stays sign-in-free, and a 3-case desktop-only Playwright spec proving an unsigned or forged HTTP request never reaches the app at all.

## Test counts

- **Before:** `npm test` — 80 test files, 3448 passed, 2 skipped (3450 total).
- **After:** `npm test` — 83 test files, 3478 passed, 2 skipped (3480 total). (+3 files, +30 tests: 21 in the two Task 1 files, 8 in the Task 2 route test, 1 added to open-access.test.ts.)
- `npm run lint -- --max-warnings 0` — clean, both tasks.
- `npx tsc --noEmit` — clean, both tasks.

## Playwright

`PW_PORT=3120 npx playwright test e2e/clerk-webhook.spec.ts --project=desktop` — **3 passed** (E1 unsigned POST → 400 with no leaked id, E2 made-up svix headers → 400, E3 GET → 405). No dev server was started by hand; Playwright's own `webServer` ran it, and `git status` showed no AGENTS.md or next-env.d.ts rewrite to exclude from the commit.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - blocking issue] `@clerk/nextjs/webhooks`'s `verifyWebhook` types its request parameter narrower than what it actually accepts**
- **Found during:** Task 1, first `tsc --noEmit` pass.
- **Issue:** The installed `@clerk/nextjs` 7.8.2 types `verifyWebhook(request: RequestLike, ...)` where `RequestLike = NextRequest | NextApiRequest | GsspRequest` — a plain Web `Request` (what the plan's `app/api/webhooks/clerk/route.ts` and `handleClerkWebhook`'s own `Request` parameter both use) doesn't satisfy that type, even though the plan's own interfaces note says "A Web Request passes straight through to @clerk/backend's version."
- **Fix:** Read `node_modules/@clerk/nextjs/dist/cjs/webhooks.js` to confirm the runtime behavior: it checks `isRequestWebAPI(request)` and, when true, passes the Web `Request` straight through to `@clerk/backend`'s own `verifyWebhook` (which types its parameter as plain `Request`) with no transformation. Added one small, explicitly-commented type-only cast (`Parameters<typeof verifyWebhook>[0]`) at each of the three call sites (the real route, and the two test files that call `verifyWebhook` directly with a real signature) rather than switching away from the plan's pinned import.
- **Files modified:** `app/api/webhooks/clerk/route.ts`, `lib/clerk-webhook.test.ts`.
- **Commits:** a3794c9 (route.ts, clerk-webhook.test.ts).

**2. [Rule 3 - blocking issue] `lib/db/account-deletion.test.ts`'s schema-scan predicate didn't satisfy TypeScript's generic variance rules**
- **Found during:** Task 1, `tsc --noEmit`.
- **Issue:** Each `lib/db/schema.ts` export is typed as its own specific `PgTableWithColumns<{...}>` shape; a `(value): value is PgTable => is(value, PgTable)` predicate across a union of those specific shapes is rejected by TS as an unsound narrowing (`PgTable<TableConfig>` isn't assignable to the specific per-table type in the direction a type-predicate needs).
- **Fix:** Kept the interfaces-recipe runtime check (`is(value, PgTable)`) exactly as pinned, and added one `as unknown as PgTable[]` cast immediately after the runtime filter, with a comment explaining this bridges a TS variance limitation rather than loosening the actual check.
- **Files modified:** `lib/db/account-deletion.test.ts`.
- **Commit:** a3794c9.

**3. [Rule 1 - bug] `vi.spyOn` on an already-mocked property returns the same mock instance, leaking call history across tests**
- **Found during:** Task 2, first `lib/clerk-webhook-route.test.ts` run — R2 (`session.created` should never call `batch`) failed because it inherited R1's recorded call.
- **Issue:** Re-calling `vi.spyOn(db, "batch")` in `beforeEach` without restoring the previous spy first just returns the existing mock (with its prior call history intact) rather than creating a fresh one, so assertions like "batch was never called" failed on a later, unrelated test.
- **Fix:** Added `batchSpy.mockRestore()` in `afterEach`, so each test's `beforeEach` re-spies on the real, un-mocked `db.batch`.
- **Files modified:** `lib/clerk-webhook-route.test.ts`.
- **Commit:** e405af7.

No architectural changes; no new package; no schema change; `package.json`, `package-lock.json` and `lib/db/schema.ts` are byte-identical to before this plan (`git diff --stat 2df8320..HEAD -- package.json package-lock.json lib/db/schema.ts drizzle` is empty).

## Known Stubs

None.

## Threat Flags

None — all new surface (the route, the two deletes, the log lines) was already accounted for in the plan's own threat model, and every disposition (`mitigate`/`accept`) is proven by the behaviors listed above.

## The founder's four user_setup steps (copied verbatim for the orchestrator)

> Turns on Clerk's own Delete account button and tells Clerk to call the app when an account is deleted, so that account's saved boards and settings are removed too. Until the steps below are done, nothing changes on the live site: the button stays hidden and the new address answers every call with a refusal.

1. **Allow shapers to delete their own accounts** — Clerk Dashboard, with the Production instance selected at the top -> User & authentication -> User model -> User permissions -> 'Allow users to delete their accounts' ON. Clerk's Delete account button then appears under Manage account in the account menu, with Clerk's own confirmation.
2. **Add the webhook endpoint and copy its Signing Secret** — Clerk Dashboard (Production instance) -> Webhooks -> Add Endpoint -> Endpoint URL `https://www.shaperassistant.com/api/webhooks/clerk` -> subscribe to the `user.deleted` event ONLY -> Create -> on the endpoint's page, reveal the Signing Secret (eye icon) and copy it for step 3. It is a secret: paste it only into Vercel.
3. **Env var `CLERK_WEBHOOK_SIGNING_SECRET`** — source: the Signing Secret copied in step 2. Vercel -> shaper project -> Settings -> Environment Variables -> add `CLERK_WEBHOOK_SIGNING_SECRET` for Production only (not Development, not Preview) -> save, then push/redeploy so the live site reads it. If this step is missed, Clerk's log shows 400 for every delivery and Vercel's log says the signing secret is not set on the server. Clerk keeps retrying a delivery that didn't get a 200 for a while, so fixing the setting soon after still cleans up.
4. **Live test, after step 3's redeploy is live** — Sign up a throwaway account on `https://www.shaperassistant.com`, save one board, then delete the account from the account menu -> Manage account -> Delete account. In Clerk Dashboard -> Webhooks -> the endpoint's message log, the `user.deleted` delivery shows 200 and its response reads "Deleted: saved boards 1, settings rows N" (N is 0 or 1, depending on whether the throwaway account ever changed a setting). The response carries counts only, never the account.

## Self-Check: PASSED

- `lib/clerk-webhook.ts` — FOUND
- `lib/clerk-webhook.test.ts` — FOUND
- `lib/clerk-webhook-test-signing.ts` — FOUND
- `lib/db/account-deletion.ts` — FOUND
- `lib/db/account-deletion.test.ts` — FOUND
- `app/api/webhooks/clerk/route.ts` — FOUND
- `lib/clerk-webhook-route.test.ts` — FOUND
- `e2e/clerk-webhook.spec.ts` — FOUND
- Commit `a3794c9` — FOUND in `git log --oneline --all`
- Commit `e405af7` — FOUND in `git log --oneline --all`
