---
phase: quick-260930-ckm
plan: 01
type: execute
wave: 1
depends_on: []
files_modified:
  - lib/clerk-webhook.ts
  - lib/clerk-webhook.test.ts
  - lib/db/account-deletion.ts
  - lib/db/account-deletion.test.ts
  - app/api/webhooks/clerk/route.ts
  - lib/clerk-webhook-route.test.ts
  - lib/auth/open-access.test.ts
  - e2e/clerk-webhook.spec.ts
autonomous: true
requirements: [QT-260930-ckm, 13-SPEC-item-11a]
user_setup:
  - service: clerk
    why: "Turns on Clerk's own Delete account button and tells Clerk to call the app when an account is deleted, so that account's saved boards and settings are removed too. Until the steps below are done, nothing changes on the live site: the button stays hidden and the new address answers every call with a refusal."
    dashboard_config:
      - task: "1. Allow shapers to delete their own accounts"
        location: "Clerk Dashboard, with the Production instance selected at the top -> User & authentication -> User model -> User permissions -> 'Allow users to delete their accounts' ON. Clerk's Delete account button then appears under Manage account in the account menu, with Clerk's own confirmation."
      - task: "2. Add the webhook endpoint and copy its Signing Secret"
        location: "Clerk Dashboard (Production instance) -> Webhooks -> Add Endpoint -> Endpoint URL https://www.shaperassistant.com/api/webhooks/clerk -> subscribe to the user.deleted event ONLY -> Create -> on the endpoint's page, reveal the Signing Secret (eye icon) and copy it for step 3. It is a secret: paste it only into Vercel."
      - task: "4. Live test, after step 3's redeploy is live"
        location: "Sign up a throwaway account on https://www.shaperassistant.com, save one board, then delete the account from the account menu -> Manage account -> Delete account. In Clerk Dashboard -> Webhooks -> the endpoint's message log, the user.deleted delivery shows 200 and its response reads 'Deleted: saved boards 1, settings rows N' (N is 0 or 1, depending on whether the throwaway account ever changed a setting). The response carries counts only, never the account."
    env_vars:
      - name: CLERK_WEBHOOK_SIGNING_SECRET
        source: "3. The Signing Secret copied in step 2. Vercel -> shaper project -> Settings -> Environment Variables -> add CLERK_WEBHOOK_SIGNING_SECRET for Production only (not Development, not Preview) -> save, then push/redeploy so the live site reads it. If this step is missed, Clerk's log shows 400 for every delivery and Vercel's log says the signing secret is not set on the server. Clerk keeps retrying a delivery that didn't get a 200 for a while, so fixing the setting soon after still cleans up."

estimate:
  # Sequential on main in the main checkout; plan-time HEAD 2df8320. Two tasks:
  # - Task 1: reads ~6 small files (client.ts, schema.ts, fit-defaults-save.test.ts, the two Clerk
  #   webhook files, route.md's Webhooks section); writes the core (~110 lines), its tests
  #   (~220 lines incl. real-signature cases), the DB delete (~50 lines) + tests (~90 lines),
  #   and the route (~35 lines).
  # - Task 2: route wiring test (~150 lines), open-access.test.ts (+~30 lines), one small
  #   desktop-only Playwright spec (~60 lines) + one dev-server run.
  # estimate-calibration: factor 1, 0 samples, so confidence is low.
  tokens: 60000
  raw_tokens: 60000
  tasks: 2
  confidence: low

must_haves:
  truths:
    - "A correctly signed user.deleted event for a shaper removes all of that shaper's saved boards (models rows) and their settings row (user_preferences) in ONE all-or-nothing database transaction (Drizzle's neon-http db.batch, which Neon runs as a single non-interactive Postgres transaction), and answers 200 with a plain-text body carrying the two counts only."
    - "A request that fails Clerk's signature check — no svix headers, a tampered body, a wrong secret, or a timestamp more than 5 minutes off — answers 400 with the bland body 'Webhook refused', and the database is never called. With no signing secret set on the server, every request answers 400 the same way, and verification is not even attempted."
    - "A repeat delivery of the same deletion deletes nothing and still answers 200. Any other event type answers 200 ('Ignored') and does nothing. A user.deleted without a non-empty string id answers 200 ('Nothing to delete') and deletes nothing."
    - "A database failure answers 500 ('Webhook failed') so Clerk retries later."
    - "No log line ever contains the user id, an email address, the payload or an error's message — only the event type and the counts. (Drizzle's query errors put the query's params, i.e. the user id, into their message, so errors are never logged.)"
    - "The route stays open per D-01: no sign-in gate, no redirect, no protect call; its only guard is Clerk's signature. It serves POST only; a GET answers 405."
    - "Every table in lib/db/schema.ts that has a clerk_user_id column is covered by the deletion (today: models and user_preferences); a unit test fails the moment a future table keyed by a shaper is added without being covered. The blanks catalogue is never touched."
    - "npm test, npm run lint -- --max-warnings 0 and npx tsc --noEmit pass after each task. PW_PORT=3120 npx playwright test e2e/clerk-webhook.spec.ts --project=desktop passes. No UI changes and no schema change or migration."
  artifacts:
    - path: lib/clerk-webhook.ts
      provides: "The pure-ish core: AccountDataDeleted and ClerkWebhookDeps types, handleClerkWebhook(request, deps) returning a Response, and handleClerkEvent(event, deps). Imports only types from Clerk; no DB, no env, no console."
      contains: "export async function handleClerkWebhook"
    - path: lib/db/account-deletion.ts
      provides: "accountDeletionStatements(database, clerkUserId) — the two owner-scoped deletes with returning — and deleteAccountData(database, clerkUserId), which runs them through database.batch and returns the counts. Never imports lib/db/client.ts."
      contains: "export async function deleteAccountData"
    - path: app/api/webhooks/clerk/route.ts
      provides: "POST only. Wires verifyWebhook from @clerk/nextjs/webhooks, deleteAccountData bound to db, the secret-present flag and console logging into handleClerkWebhook."
      contains: "export async function POST"
    - path: lib/clerk-webhook-route.test.ts
      provides: "Imports the real route with stubbed env and a spy on db.batch; proves a runtime-signed request flows through the route to the database call, and refused requests never reach it."
      contains: "vi.spyOn"
    - path: e2e/clerk-webhook.spec.ts
      provides: "HTTP proof on the dev server: an unsigned POST and a made-up-signature POST answer 400 with no redirect; a GET answers 405."
      contains: "/api/webhooks/clerk"
  key_links:
    - from: app/api/webhooks/clerk/route.ts
      to: lib/clerk-webhook.ts
      via: "POST(request) returns handleClerkWebhook(request, { signingSecretSet, verify: (r) => verifyWebhook(r), deleteAccountData: (id) => deleteAccountData(db, id), log: (level, line) => console[level](line) })"
    - from: lib/clerk-webhook.ts
      to: lib/db/account-deletion.ts
      via: "event.type === 'user.deleted' with a non-empty string data.id -> deps.deleteAccountData(data.id) -> { boards, settings }"
    - from: lib/db/account-deletion.ts
      to: "Neon Postgres (models, user_preferences)"
      via: "database.batch([delete from models where clerk_user_id = $1 returning id, delete from user_preferences where clerk_user_id = $1 returning clerk_user_id]) — one HTTP request, one transaction"
    - from: "Clerk (Svix) user.deleted delivery"
      to: app/api/webhooks/clerk/route.ts
      via: "POST https://www.shaperassistant.com/api/webhooks/clerk with svix-id / svix-timestamp / svix-signature headers, signed with CLERK_WEBHOOK_SIGNING_SECRET"
---

<objective>
Phase 13 item 11a (13-SPEC.md, the founder's choice of 2026-09-30): when a shaper deletes their account with Clerk's own Delete account button — or the founder deletes it from Clerk's dashboard — Clerk sends a signed `user.deleted` message to the app, and the app removes that account's saved boards and settings from the database. Nothing a shaper sees changes; Clerk's button appears once the founder turns deletion on in Clerk's dashboard (user_setup step 1).

Purpose: the privacy page (item 11, paused plan 260930-03d) can only promise "delete your account and everything saved with it" once this is true.

Output: a POST-only Route Handler at `app/api/webhooks/clerk/route.ts`, a small tested core in `lib/clerk-webhook.ts`, the atomic delete in `lib/db/account-deletion.ts`, unit tests (including real Standard Webhooks signatures made in the test with `node:crypto`, no new packages), an extended open-access test, and a desktop-only Playwright HTTP spec. No schema change, no table, no migration, no new dependency.

Source coverage (every item planned):

| Source | Item | Covered by |
|--------|------|------------|
| GOAL (13-SPEC item 11a done-when) | a deleted account's boards and settings are gone; Clerk's log shows success | Task 1 (delete + 200 with counts), user_setup steps 1–4 (the founder's live test) |
| REQ | QT-260930-ckm, 13-SPEC-item-11a | Tasks 1–2 |
| CONTEXT (orchestrator brief) | verifyWebhook, 400 on any verification failure, nothing deleted | Task 1 behaviors 1–2, 8; Task 2 |
| CONTEXT | user.deleted -> delete models + user_preferences, atomic, idempotent, 200 | Task 1 behaviors 3–4 (atomic via db.batch) |
| CONTEXT | other events 200, DB failure 500, logs type + counts only | Task 1 behaviors 5–7 |
| CONTEXT | testable core with injected fakes + real-signature test | Task 1 (signing is possible without new deps — proven at plan time) |
| CONTEXT | open-access test extended; matcher covers /api | Task 2 |
| CONTEXT | unsigned POST 400, GET not served, Playwright request fixture, desktop | Task 2 |
| CONTEXT | founder's four setup steps | frontmatter user_setup |
| RESEARCH | none for a quick task | — |
</objective>

<execution_context>
@$HOME/.claude/gsd-core/workflows/execute-plan.md
@$HOME/.claude/gsd-core/templates/summary.md
</execution_context>

<context>
@CLAUDE.md
@AGENTS.md
@proxy.ts
@lib/auth/open-access.test.ts
@lib/db/client.ts
@lib/db/schema.ts
@lib/db/fit-defaults-save.test.ts

Read only the named parts:
- `.planning/phases/13-ready-for-the-shapers/13-SPEC.md` lines 103–105 (item 11a) and the "Rules that hold for every item" section.
- `node_modules/@clerk/backend/dist/webhooks.mjs` (the whole file is ~70 lines — the verifier this app calls).
- `node_modules/@clerk/backend/dist/api/resources/Webhooks.d.ts` (31 lines) and `node_modules/@clerk/backend/dist/api/resources/JSON.d.ts` lines 656–672 (`DeletedObjectJSON`, `UserDeletedJSON`).
- `node_modules/next/dist/docs/01-app/03-api-reference/03-file-conventions/route.md` — the "HTTP Methods" and "Webhooks" sections — and line 43 of `node_modules/next/dist/docs/01-app/01-getting-started/15-route-handlers.md` (an unsupported method answers 405).
- `e2e/desktop-regression.spec.ts` lines 35–38 (the desktop-only skip idiom).

<interfaces>
Pinned at plan time from the installed packages (@clerk/nextjs 7.8.2 over @clerk/backend 3.16.12, drizzle-orm 0.45.2, @neondatabase/serverless 1.1.0, Next 16). The executor has no web access; these are the shapes to build against.

verifyWebhook — `import { verifyWebhook } from "@clerk/nextjs/webhooks"`:
- Signature: `verifyWebhook(request: RequestLike, options?: { signingSecret?: string }): Promise<WebhookEvent>`. A Web `Request` passes straight through to @clerk/backend's version.
- Secret: `options.signingSecret ?? process.env.CLERK_WEBHOOK_SIGNING_SECRET` (read at call time). Empty -> throws "Missing webhook signing secret...".
- Headers read: `svix-id`, `svix-timestamp`, `svix-signature`. Any missing -> throws "Missing required webhook headers: ...".
- Then reads `await request.text()` and verifies with Standard Webhooks; a bad signature or a timestamp more than 5 minutes either side of now -> throws "Unable to verify incoming webhook: ...".
- Returns `{ type, object: "event", data, event_attributes }`.
- Types: `import type { WebhookEvent } from "@clerk/nextjs/webhooks"` works (the module re-exports @clerk/backend's webhook types). `WebhookEvent` is a union discriminated on `type`. For `type === "user.deleted"`, `data` is `UserDeletedJSON`: `{ object: string; id?: string; slug?: string; deleted: boolean; external_id?: string }` — `id` is OPTIONAL, so narrow it with a typeof-string and non-empty check.

Standard Webhooks v1 signing (for tests; proven at plan time under this repo's vitest, no new dependency):
- key = `randomBytes(24)` from `node:crypto`, generated inside the test; secret string = `"whsec_" + key.toString("base64")`. Never write a key-shaped literal in source.
- msgId any string (e.g. `"msg_test_1"`); timestamp = whole seconds since epoch as a string.
- signature = `createHmac("sha256", key).update(msgId + "." + timestamp + "." + rawBody).digest("base64")`.
- headers: `svix-id: msgId`, `svix-timestamp: timestamp`, `svix-signature: "v1," + signature`.
- Pass the secret with `verifyWebhook(request, { signingSecret: secret })` in core tests, or via `vi.stubEnv("CLERK_WEBHOOK_SIGNING_SECRET", secret)` in the route test.

Drizzle on Neon HTTP (`lib/db/client.ts` exports `db = drizzle(neon(process.env.DATABASE_URL!), { schema })`):
- `db.batch([q1, q2])` exists (type `NeonHttpDatabase<typeof schema>` from `drizzle-orm/neon-http`) and runs through Neon's `sql.transaction([...])`: ONE HTTP request, ONE non-interactive Postgres transaction — both deletes commit or neither does. Resolves to a tuple of each query's result; with `.returning(...)` each is an array of rows.
- `db.transaction(...)` THROWS "No transactions support in neon-http driver" — use `batch`.
- Importing `lib/db/client.ts` calls `neon(process.env.DATABASE_URL!)` at module load, so any module a unit test imports statically must not import it. The route imports it; the route test stubs `DATABASE_URL` first, then imports dynamically.
- Pinned SQL (from `.toSQL()` on an unconnected db, the fit-defaults-save.test.ts idiom):
  - boards: `delete from "models" where "models"."clerk_user_id" = $1 returning "id"`, params `[clerkUserId]`
  - settings: `delete from "user_preferences" where "user_preferences"."clerk_user_id" = $1 returning "clerk_user_id"`, params `[clerkUserId]`
- Schema scan (proven): iterate `Object.values(schema)`, keep values where `is(value, PgTable)` (`is` from `drizzle-orm`, `PgTable` and `getTableConfig` from `drizzle-orm/pg-core`), and keep tables whose `getTableConfig(t).columns` has a column named `clerk_user_id`. Today that yields `["models", "user_preferences"]`.
- `DrizzleQueryError`'s message is `Failed query: <sql>\nparams: <params>` — i.e. it contains the user id. Never log an error object or its message.

Next 16 Route Handler: `app/api/webhooks/clerk/route.ts` exporting only `export async function POST(request: Request)`. A method with no export answers 405 automatically; OPTIONS is auto-implemented. POST handlers are never cached; no route segment config is needed. `proxy.ts`'s matcher `/(api|trpc)(.*)` already runs `clerkMiddleware()` on this path, and that middleware gates nothing (D-01) — a request with no session simply passes through signed out.
</interfaces>
</context>

<tasks>

<task type="auto" tdd="true">
  <name>Task 1: A signed "account deleted" message from Clerk removes that account's boards and settings — one path, end to end</name>
  <files>lib/clerk-webhook.ts, lib/clerk-webhook.test.ts, lib/db/account-deletion.ts, lib/db/account-deletion.test.ts, app/api/webhooks/clerk/route.ts</files>
  <behavior>
    lib/clerk-webhook.test.ts — the core with injected fakes (a `vi.fn` deleteAccountData, a recording log, a `vi.fn` verify):
    - 1. signingSecretSet false -> 400, body exactly "Webhook refused", verify NOT called, deleteAccountData NOT called, one "warn" line saying no signing secret is set on this server.
    - 2. verify rejects -> 400, body "Webhook refused", deleteAccountData NOT called, one "warn" line saying the signature did not verify; the line does not include the thrown error's message.
    - 3. user.deleted with data.id "user_test_2abc" -> deleteAccountData called exactly once with exactly "user_test_2abc"; fake resolves { boards: 2, settings: 1 } -> 200, body "Deleted: saved boards 2, settings rows 1"; one "info" line containing "user.deleted", "2" and "1".
    - 4. The same event again with the fake resolving { boards: 0, settings: 0 } -> 200, body "Deleted: saved boards 0, settings rows 0" (idempotent repeat delivery).
    - 5. user.deleted with no id, an empty-string id, and a non-string id (cast through unknown) -> 200, body "Nothing to delete", deleteAccountData NOT called.
    - 6. user.created (data carrying an email address such as "shaper@example.com"), session.created and email.created -> 200, body "Ignored", deleteAccountData NOT called; the log line names the event type.
    - 7. deleteAccountData rejects with an Error whose message contains "user_test_2abc" (mimicking Drizzle's "Failed query ... params: ..." message) -> 500, body "Webhook failed", one "error" line.
    - Across every case above: no recorded log line and no response body contains the user id, the email address or the error's message.
    - 8. Real signatures (the interfaces recipe, verify = (r) => verifyWebhook(r, { signingSecret: testSecret })): a correctly signed user.deleted reaches deleteAccountData with its id and answers 200; the same request with the body's id changed after signing -> 400 and deleteAccountData NOT called; signed with a different runtime-generated key -> 400; signed with a timestamp 10 minutes in the past -> 400; no svix headers at all -> 400.
    lib/db/account-deletion.test.ts — an unconnected `drizzle(neon("postgresql://nobody:nothing@localhost/none"), { schema })`, the fit-defaults-save.test.ts idiom:
    - 9. accountDeletionStatements(testDb, "user_test") renders exactly the two pinned SQL strings, in that order, each with params ["user_test"].
    - 10. Every table in lib/db/schema.ts with a clerk_user_id column is the target of one of the statements, and there are exactly as many statements as such tables (today models and user_preferences; the blanks table is never a target). The failure message tells a future developer to add the new table to the deletion.
    - 11. deleteAccountData(testDb, "user_test") with `vi.spyOn(testDb, "batch")` resolving [[{ id: "a" }, { id: "b" }], [{ clerkUserId: "user_test" }]] returns { boards: 2, settings: 1 }; batch is called exactly once with a two-item array (one round trip, one transaction).
    - 12. batch resolving [[], []] returns { boards: 0, settings: 0 }.
    - 13. batch rejecting -> deleteAccountData rejects (the error propagates so the core answers 500).
  </behavior>
  <action>
Write the tests first (RED), then the code (GREEN). This task wires the one path — Clerk's signed message -> the route -> the core -> the atomic delete — end to end. It is built to keep, not as a prototype.

1. `lib/clerk-webhook.ts` — the core. No runtime import from Clerk, the database, `process.env` or `console`: only `import type { WebhookEvent } from "@clerk/nextjs/webhooks"`. Export:
   - type `AccountDataDeleted = { boards: number; settings: number }`
   - type `ClerkWebhookLogLevel = "info" | "warn" | "error"`
   - type `ClerkWebhookDeps = { signingSecretSet: boolean; verify: (request: Request) => Promise<WebhookEvent>; deleteAccountData: (clerkUserId: string) => Promise<AccountDataDeleted>; log: (level: ClerkWebhookLogLevel, line: string) => void }`
   - `handleClerkWebhook(request: Request, deps): Promise<Response>`. When signingSecretSet is false, log "warn" and answer 400 without calling verify. Otherwise await verify inside try/catch; on any throw, log "warn" and answer 400. Never pass the caught error, its message or the request body to the log. Then return `handleClerkEvent(event, deps)`.
   - `handleClerkEvent(event: WebhookEvent, deps): Promise<Response>`. Narrow on `event.type === "user.deleted"`. Other types: log "info" with the type, answer 200 "Ignored". user.deleted without a non-empty string `data.id`: log "info", answer 200 "Nothing to delete". Otherwise await `deps.deleteAccountData(id)` in try/catch. Success: log "info" with the type and both counts, answer 200 "Deleted: saved boards N, settings rows M". Throw: log "error" with a fixed line saying the delete failed and Clerk will retry — never the error or its message, because Drizzle's query errors carry the user id in their params — and answer 500 "Webhook failed".
   - Responses: plain text via `new Response(body, { status, headers: { "content-type": "text/plain; charset=utf-8" } })`. Keep the four bodies exactly as in the behavior list and export them as a frozen `CLERK_WEBHOOK_BODIES` object so the tests and the Playwright spec import them rather than retyping them.
   - Log lines are fixed English sentences prefixed "Clerk webhook:" carrying at most the event type and the two counts — never the id, the payload or an email.
   - Header comment in plain English: Clerk calls this when an account is deleted — by the shaper from Manage account, or by the founder from Clerk's dashboard (13-SPEC item 11a, the founder's choice 2026-09-30). The route is open to the internet on purpose (D-01 — nothing in this app is gated by sign-in, and Clerk's server is never signed in); Clerk's signature is the only guard. Why a bland 400; why 500 means "Clerk, try again"; why errors are never logged.

2. `lib/db/account-deletion.ts` — imports `eq` from "drizzle-orm", the type `NeonHttpDatabase` from "drizzle-orm/neon-http", `* as schema` plus `models` and `userPreferences` from "./schema", and the type `AccountDataDeleted` from "@/lib/clerk-webhook". It must NOT import "./client" (that module dials Neon at load; the route passes `db` in). Export:
   - type `ShaperDatabase = NeonHttpDatabase<typeof schema>`
   - `accountDeletionStatements(database: ShaperDatabase, clerkUserId: string)` returning a readonly tuple: the models delete (where clerkUserId equals the id, `.returning({ id: models.id })`), then the user_preferences delete (`.returning({ clerkUserId: userPreferences.clerkUserId })`).
   - `async deleteAccountData(database: ShaperDatabase, clerkUserId: string): Promise<AccountDataDeleted>`: await `database.batch(accountDeletionStatements(database, clerkUserId))`, destructure the two row arrays, return their lengths as boards and settings. Let errors propagate.
   - Header comment: why `batch` (one HTTP request, one transaction — never boards gone and settings left, or the reverse); why `db.transaction` is not used (neon-http throws); why this function takes the owner as a parameter, unlike lib/db/queries.ts: the id comes only from a Clerk-signed event, never from a browser. The ownership tests in lib/db/ownership.test.ts guard queries.ts and the actions, and this file is not one of them.

3. `app/api/webhooks/clerk/route.ts` — POST only; no other method export. `export async function POST(request: Request): Promise<Response>` returns `handleClerkWebhook(request, deps)` with these deps:
   - signingSecretSet: `Boolean(process.env.CLERK_WEBHOOK_SIGNING_SECRET?.trim())`, read inside POST so it is checked on every request.
   - verify: `(r) => verifyWebhook(r)` from "@clerk/nextjs/webhooks", which falls back to that env var.
   - deleteAccountData: `(id) => deleteAccountData(db, id)`, with `db` from "@/lib/db/client".
   - log: `(level, line) => console[level](line)`.

   Do not call `auth()` or `currentUser()`, redirect, or add route segment config. Header comment in plain English: the address Clerk calls; the founder's four setup steps live in quick plan 260930-ckm; no sign-in gate by design (D-01).

4. Commit. First run: `npx vitest run lib/clerk-webhook.test.ts lib/db/account-deletion.test.ts`, then `npm test`, `npm run lint -- --max-warnings 0`, `npx tsc --noEmit`. If tsc complains about stale `.next/types`, run `npx next typegen` once and retry. Stage the five files by explicit path and commit with `git commit -F <message file in the scratchpad>`. Subject: "feat: deleting a Clerk account now deletes that shaper's saved boards and settings too (quick 260930-ckm)". Body, in plain English for shapers:
   - When a shaper deletes their account (or the founder deletes it from Clerk), Clerk tells the app, and the app removes every board that account saved and its settings, all at once or not at all.
   - Nothing on screen changes; Clerk's Delete account button appears once the founder turns it on in Clerk.
   - Only a message carrying Clerk's signature can trigger it.

   End the body with the line `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>`. Never push.
  </action>
  <verify>
    <automated>npx vitest run lib/clerk-webhook.test.ts lib/db/account-deletion.test.ts && npm test && npm run lint -- --max-warnings 0 && npx tsc --noEmit</automated>
  </verify>
  <done>All 13 behaviors are green, including the real-signature cases built with node:crypto and no new package. The full unit suite, lint (0 warnings) and tsc pass. The route exists with POST only. One commit holds exactly the five files. package.json and package-lock.json are unchanged.</done>
</task>

<task type="auto" tdd="true">
  <name>Task 2: Prove from the outside that only Clerk can trigger the cleanup — the real route, the open-access rule, and the dev server</name>
  <files>lib/clerk-webhook-route.test.ts, lib/auth/open-access.test.ts, e2e/clerk-webhook.spec.ts</files>
  <behavior>
    lib/clerk-webhook-route.test.ts — the real route module, imported dynamically in beforeAll AFTER `vi.stubEnv("DATABASE_URL", "postgresql://nobody:nothing@localhost/none")` and `vi.stubEnv("CLERK_WEBHOOK_SIGNING_SECRET", testSecret)` (testSecret generated at runtime by the interfaces recipe); `db` imported dynamically from "@/lib/db/client" and `vi.spyOn(db, "batch")`, reset before each test; `vi.unstubAllEnvs()` in afterAll:
    - R1. A correctly signed user.deleted for "user_test_route" -> 200, body "Deleted: saved boards 1, settings rows 1" (spy resolves [[{ id: "a" }], [{ clerkUserId: "user_test_route" }]]). The spy is called once with two statements whose `.toSQL()` are the two pinned deletes, each with params ["user_test_route"].
    - R2. A correctly signed session.created -> 200 "Ignored", batch NOT called.
    - R3. The signed user.deleted with its body altered after signing -> 400 "Webhook refused", batch NOT called.
    - R4. An unsigned POST (JSON body, no svix headers) -> 400, batch NOT called.
    - R5. With `vi.stubEnv("CLERK_WEBHOOK_SIGNING_SECRET", "")` for one test, a request signed with testSecret -> 400 and batch NOT called; restore the stub to testSecret afterwards.
    - R6. The spy rejects -> signed user.deleted answers 500 "Webhook failed".
    - R7. The route module exports a POST function and no GET, PUT, PATCH, DELETE or HEAD export (check the imported module's keys).
    - R8. No non-test .ts/.tsx file under app/, components/ or lib/ names the signing-secret variable with Next's public-variable prefix. Build the needle from parts, the delivery.test.ts boundary (b) idiom, so this test's own source never matches.
    lib/auth/open-access.test.ts — one new `it` inside the existing describe, named "the Clerk webhook is a public route guarded only by Clerk's signature (quick 260930-ckm)":
    - O1. app/api/webhooks/clerk/route.ts exists. Its comment-stripped source declares an async POST function and imports verifyWebhook from "@clerk/nextjs/webhooks".
    - O2. The stripped source has no other HTTP-method function export and no call to auth(, currentUser(, redirect(, notFound( or .protect(. Use word-boundary regexes so verifyWebhook( never matches.
    - O3. proxy.ts's stripped source still contains the "/(api|trpc)(.*)" matcher entry and no createRouteMatcher. clerkMiddleware runs on the route and gates nothing (D-01).
    e2e/clerk-webhook.spec.ts — desktop project only (skip others with the desktop-regression beforeEach idiom); Playwright's `request` fixture; every call with `maxRedirects: 0`:
    - E1. POST /api/webhooks/clerk with a JSON user.deleted body for "user_playwright_fake" and no svix headers -> status 400, text exactly CLERK_WEBHOOK_BODIES.refused (imported from ../lib/clerk-webhook), and the text does not contain "user_playwright_fake".
    - E2. The same POST with made-up svix-id, svix-timestamp (now) and svix-signature ("v1," plus a made-up base64 string) headers -> 400, same bland text.
    - E3. GET /api/webhooks/clerk -> 405.
  </behavior>
  <action>
This task adds tests only; if a test exposes a real defect in Task 1's code, fix it there and name the fix in the SUMMARY.

1. `lib/clerk-webhook-route.test.ts` — the behaviors R1–R8.
   - Import the route through its alias path "@/app/api/webhooks/clerk/route" with `await import(...)` inside beforeAll, after both env stubs. A static import would dial `neon()` with no URL before the stub.
   - Share one small signing helper built from the interfaces recipe. Either copy it into this file or, if Task 1's test already defines one, move it to a test-only module `lib/clerk-webhook-test-signing.ts` and import it from both tests. That module holds no key; it takes the key as an argument. It is not a `.test.ts`, so check that tsc and lint still pass, and name it in the SUMMARY if created.
   - Header comment: why the env is stubbed before the import, why the fake DATABASE_URL is never dialled (batch is spied), and that this is the proof that the route really wires verification before the database.

2. `lib/auth/open-access.test.ts` — add the O1–O3 `it` to the existing "open access (D-01)" describe, reusing its `stripComments`, `APP_DIR`, `PROXY_PATH` and `REPO_ROOT`. Change nothing else in the file. The existing ".protect() nowhere under app/" test already scans the new route automatically; leave it as is.

3. `e2e/clerk-webhook.spec.ts` — E1–E3.
   - Header comment in the style of e2e/contact.spec.ts: this is the from-the-outside proof that a stranger can't trigger a deletion.
   - Signed requests are proved in lib/clerk-webhook-route.test.ts, because the dev server's secret is not the test's to know. The real signed delivery is the founder's live test (user_setup step 4).
   - It doesn't matter whether the dev server has a signing secret: an unsigned request is refused either way.
   - Run it with `PW_PORT=3120 npx playwright test e2e/clerk-webhook.spec.ts --project=desktop`. Port 3100 belongs to another project; don't start a dev server by hand.
   - After the run, check `git status`. If next dev rewrote AGENTS.md or next-env.d.ts, leave those files out of this commit and mention it in the SUMMARY.

4. Commit. Run `npm test`, `npm run lint -- --max-warnings 0`, `npx tsc --noEmit` and the Playwright command. Stage this task's files by explicit path, plus the shared signing helper module and any Task 1 test it replaced a copy in, if either changed. Commit with `git commit -F`. Subject: "test: prove only a message signed by Clerk can clear an account's boards (quick 260930-ckm)". Body, in plain English:
   - An unsigned or forged message is turned away before the database is touched.
   - The new address only answers POST.
   - It stays open to the internet like every page of the app, with Clerk's signature as its lock.

   End with `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>`. Never push.

5. Write `.planning/quick/260930-ckm-phase-13-item-11a-a-deleted-account-take/260930-ckm-SUMMARY.md` and do NOT commit it or this PLAN.md; the orchestrator commits the docs. Do not touch ROADMAP.md, STATE.md, 13-SPEC.md, CLAUDE.md, or the paused `.planning/quick/260930-03d-*` directory. In the SUMMARY:
   - the test counts before and after
   - the Playwright result
   - the founder's four user_setup steps, copied verbatim for the orchestrator
  </action>
  <verify>
    <automated>npx vitest run lib/clerk-webhook-route.test.ts lib/auth/open-access.test.ts && npm test && npm run lint -- --max-warnings 0 && npx tsc --noEmit && PW_PORT=3120 npx playwright test e2e/clerk-webhook.spec.ts --project=desktop</automated>
  </verify>
  <done>R1–R8, O1–O3 and E1–E3 are green. The full unit suite, lint (0 warnings), tsc and the desktop Playwright spec pass. One commit holds this task's files. The SUMMARY exists and is uncommitted, and nothing was pushed.</done>
</task>

</tasks>

<threat_model>
## Trust Boundaries

| Boundary | Description |
|----------|-------------|
| internet -> POST /api/webhooks/clerk | Anyone can reach the address (D-01: nothing is gated by sign-in). Only a request carrying Clerk's HMAC signature, made with the Signing Secret, may cause a deletion. |
| route -> Neon Postgres | A verified Clerk user id becomes the one parameter of two owner-scoped deletes. |
| route -> Vercel logs / Clerk's webhook log | What the app prints and answers must never identify the deleted shaper. |

## STRIDE Threat Register

| Threat ID | Category | Component | Severity | Disposition | Mitigation Plan |
|-----------|----------|-----------|----------|-------------|-----------------|
| T-260930-ckm-01 | Spoofing | handleClerkWebhook / route POST | critical | mitigate | verifyWebhook (Standard Webhooks HMAC-SHA256 over id.timestamp.body with the whsec secret) runs before any database call. Any throw answers 400 and deleteAccountData is never reached (Task 1 behaviors 2, 8; Task 2 R3–R5, E1–E2). |
| T-260930-ckm-02 | Tampering | signed body | high | mitigate | The signature covers the raw body; a body altered after signing is refused (behavior 8, R3). |
| T-260930-ckm-03 | Spoofing (replay) | route POST | low | mitigate | Standard Webhooks rejects timestamps more than 5 minutes off (behavior 8). A replay inside the window repeats an already-done deletion of the same account and deletes nothing more (behavior 4). |
| T-260930-ckm-04 | Information disclosure | log lines | high | mitigate | Fixed log sentences carrying only the event type and counts. Errors and payloads are never logged, because DrizzleQueryError messages carry the user id. Tests assert no log line contains the id, email or error text (Task 1). |
| T-260930-ckm-05 | Information disclosure | response bodies | medium | mitigate | Unverified callers only ever get "Webhook refused". Counts are returned only to a verified Clerk, never the id (behaviors 1–3, E1). |
| T-260930-ckm-06 | Tampering (wrong rows) | accountDeletionStatements | high | mitigate | Parameterised equality on clerk_user_id only, with the SQL shape pinned (behavior 9). The blanks catalogue is never a target (behavior 10). |
| T-260930-ckm-07 | Repudiation / privacy (left-behind data) | account-deletion coverage | medium | mitigate | A schema scan fails if any table with clerk_user_id is not deleted (behavior 10). Both deletes run in one Neon transaction via db.batch, so nothing is ever half-deleted (behavior 11). A database failure answers 500 so Clerk retries (behavior 7, R6). |
| T-260930-ckm-08 | Denial of service | route POST | low | accept | A flood of forged requests costs one HMAC each and never touches the database. Vercel's platform limits apply; no rate limiter for a free demo. |
| T-260930-ckm-09 | Information disclosure | signing secret | high | mitigate | Read only server-side from CLERK_WEBHOOK_SIGNING_SECRET (Production only, entered by the founder). Never logged. A test fails if any source names it with Next's public prefix (R8). Test secrets are generated at runtime, never written as literals. |
| T-260930-ckm-10 | Elevation of privilege | proxy.ts / D-01 | low | accept | The route runs through clerkMiddleware, which gates nothing. The open-access test (O1–O3) keeps the route free of sign-in calls that Clerk's server could never satisfy. |
| T-260930-ckm-SC | Tampering | npm installs | low | accept | No package is installed. @clerk/nextjs/webhooks and its standardwebhooks dependency are already in the lockfile, and the tests sign with node:crypto. |
</threat_model>

<verification>
- `npm test` green, including lib/clerk-webhook.test.ts, lib/db/account-deletion.test.ts, lib/clerk-webhook-route.test.ts and the extended lib/auth/open-access.test.ts.
- `npm run lint -- --max-warnings 0` and `npx tsc --noEmit` pass.
- `PW_PORT=3120 npx playwright test e2e/clerk-webhook.spec.ts --project=desktop`: an unsigned or forged POST answers 400 with no redirect, and a GET answers 405.
- `git diff --stat 2df8320..HEAD -- package.json package-lock.json lib/db/schema.ts drizzle` is empty: no new package, no schema change, no migration.
- Two commits, subjects ending "(quick 260930-ckm)", each ending with the Co-Authored-By line; nothing pushed.
</verification>

<success_criteria>
In code: a signed user.deleted removes that shaper's boards and settings atomically and answers 200 with the counts. Anything unsigned or forged is refused with 400 before the database is touched. Other events are acknowledged and ignored, and a database failure answers 500 for Clerk's retry. Nothing identifying is ever logged, and the route stays open per D-01 with Clerk's signature as its only lock.

Item 11a's done-when (13-SPEC) is met after the founder's user_setup steps 1–4: a throwaway account that saved a board deletes itself from Manage account, Clerk's webhook log shows the delivery succeeded (200, "Deleted: saved boards 1, ..."), and that account's boards and settings are gone from the database.
</success_criteria>

<output>
Create `.planning/quick/260930-ckm-phase-13-item-11a-a-deleted-account-take/260930-ckm-SUMMARY.md` when done (uncommitted; the orchestrator commits the docs).
</output>
