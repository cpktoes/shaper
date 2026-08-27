# Phase 2: Accounts & Saved Designs - Research

**Researched:** 2026-08-27
**Domain:** Next.js 16 App Router auth (Clerk) + Postgres persistence (Drizzle + Neon) for a client-side design tool
**Confidence:** MEDIUM-HIGH — stack choices are prescribed and verified against current docs/registry; the app's own client-heavy architecture (React context, no persistence yet) means several integration seams are genuinely new to this codebase, not just "add a library."

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions

**Sign-in gate**
- **D-01:** The design tool stays fully open — anyone can pick a preset and shape without an account. Sign-in is prompted early but never required to shape.
- **D-02:** The nudge is two-part: a quiet "Sign in" button at the right end of the existing top nav on every screen (shows the Clerk avatar once signed in), plus a dismissable one-time banner on the design screens: sign in and your boards are saved. Banner dismissal persists for the visit; don't nag.
- **D-03:** Sign-up/sign-in happens in a dialog over the design screen. The in-progress board carries through untouched; it is stored only when the user explicitly hits Save for the first time. No auto-save-on-signup.
- **D-04:** Sign-up methods: email/password (with emailed reset link per ACCT-03) plus Google, both via Clerk. — **Reversibility:** reversible — toggling providers is Clerk dashboard config.

**Where Save lives**
- **D-05:** One Save button in the top nav, visible on every design screen. The board-name box stays on Summary; saving an unnamed board opens a small name prompt.
- **D-06:** Home (`/`) for a signed-in user with saved boards leads with their board rack — cards above the "start a new board" preset cards. Signed-out/first-time visitors see exactly today's preset screen. No separate My Boards page.
- **D-07:** The unsaved in-progress board appears as the FIRST card in the rack, marked "In progress — not saved" — one place to look for all your boards.

**Editing a saved board**
- **D-08:** Autosave after first save: once a board has a name and a home, edits save themselves shortly after the user stops adjusting, with a subtle "Saved" tick in the nav. The Save button only does real work the first time. Anonymous users have no autosave (nothing to save to).
- **D-09:** Save writes over the board that was opened. A separate Duplicate action branches a copy for riffing on a shape. No "update or save as new?" prompts.
- **D-10:** Opening a saved board while an unsaved board is in progress asks first — same confirm pattern as Phase 1's preset replacement (D-07 of Phase 1). One consistent rule everywhere a board gets swapped out.

**What a saved board holds**
- **D-11:** A save captures the full design snapshot — everything `DesignState` holds today: outline, rails, fins, volume, boardName, finSystem, and the import toggles. Reopening restores the design exactly; "reopen and continue editing" (MODL-02) requires nothing less.
- **D-12:** Rack cards show: outline thumbnail (same rendering as preset cards), board name, length × width × thickness in shaper units plus volume in litres, and last-touched date.
- **D-13:** Board management on each rack card: Rename, Duplicate ("copy of …"), Delete behind an are-you-sure naming the board. No trash/undo system — the confirm is the safety.

### Claude's Discretion
- Dialog styling and exact banner/confirm wording (plain English, shaper audience).
- Autosave debounce timing and failure handling (retry/quiet error state).
- Database schema shape, serialization format of the design snapshot, and migration setup — subject to the metric-storage rule.
- Rack sort order (last-touched first is a sensible default) and card menu affordance.
- Clerk + Neon environment/config mechanics on Vercel.

### Deferred Ideas (OUT OF SCOPE)
- Copy-spec-to-clipboard across design screens (todo, UI polish — not accounts/saving)
- Rails viewer "View Full Sized" modal + plan view (todo, UI polish)
</user_constraints>

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|------------------|
| ACCT-01 | User can sign up with email and password | Clerk `<SignUp>` component (email/password strategy) embedded in the app's own dialog per D-03/D-04 — see Architecture Patterns and Pitfall 5 for the Google-provider counterpart |
| ACCT-02 | User can log in and stay logged in across sessions | Clerk session cookie + `clerkMiddleware()` in `proxy.ts` (Pattern 1) — session persistence is entirely Clerk-managed, no custom token logic |
| ACCT-03 | User can reset password via email link | Clerk's built-in forgot-password flow inside `<SignIn>` — hosted email delivery, no app code required |
| MODL-01 | User can save a design as a named model tied to their account | `models` table (Pattern 3) + `saveModel` Server Action (Pattern 2), snapshot validated by Zod (Don't Hand-Roll) |
| MODL-02 | User can reopen and edit a previously saved model | `loadModel` Server Action returns the validated snapshot; `applyModel` on `DesignProvider` mirrors today's `applyPreset` (System Architecture Diagram, step "Home page") |
| MODL-03 | User can view a list of their saved models | `listModels(userId)` plain async read function called from the `app/page.tsx` Server Component, passed as props into `SetupScreen`/`board-rack.tsx` (Architectural Responsibility Map, Recommended Project Structure) |
</phase_requirements>

## Summary

This phase bolts two things onto an app that has, until now, been entirely client-side and stateless: Clerk for accounts, and Neon Postgres via Drizzle for saved designs. Both are prescribed in CLAUDE.md, so the stack choice isn't in question — the research risk is in the *seams*: Next.js 16 renamed `middleware.ts` to `proxy.ts` (a breaking change since this project's training-data baseline), Clerk's own docs already reflect that rename, and the sign-in flow this phase wants (a dialog *over* the design screen, never a redirect, never required to shape) means route-level gating (`auth.protect()`) is the wrong tool — this phase needs `clerkMiddleware()` present (so `auth()` works in Server Actions/Components) but calling **no** `.protect()` anywhere, because D-01 keeps every route open to anonymous users.

The save/load/list/rename/duplicate/delete surface is a set of Server Actions, each independently re-deriving the caller's identity from `auth()` and re-checking row ownership — never trusting a client-supplied `userId`. The design snapshot (D-11: the full `DesignState`) is a plain JSON object today (branded `Mm`/`Degrees`/`Litres` values are just numbers at runtime), so it serializes into a single `jsonb` column with no transform needed; Zod validates its shape at the DB boundary. No local `users` table is needed — Clerk is the source of truth for identity, and the `models` table just carries the Clerk user ID as an indexed text column.

**Primary recommendation:** `clerkMiddleware()` in `proxy.ts` with no `.protect()` calls (open by default, matching D-01); Server Actions in `app/design/actions.ts` (or similar) for all model mutations, each starting with `const { userId } = await auth(); if (!userId) throw ...`; a single `models` table (`id`, `clerkUserId` indexed text, `name`, `snapshot` jsonb, `createdAt`, `updatedAt`); Clerk's own `<SignIn>`/`<SignUp>` components rendered inside the app's existing shadcn `Dialog`, not Clerk's built-in `mode="modal"` (to match the surf theme rather than Clerk's default styling — Claude's discretion per CONTEXT.md).

## Architectural Responsibility Map

| Capability | Primary Tier | Secondary Tier | Rationale |
|------------|-------------|----------------|-----------|
| Sign-up / sign-in / session persistence | Browser (Clerk client components) | API/Backend (Clerk-hosted session validation via `proxy.ts` + `auth()`) | Clerk owns the credential/session lifecycle end-to-end; the app only reads `auth()`/`useUser()` |
| Password reset | Browser (Clerk `<SignIn>` forgot-password flow) | — | Fully handled by Clerk's hosted email + flow; no app code sends email |
| Route-level auth context (no gating) | API/Backend (`proxy.ts` running `clerkMiddleware()`) | — | Required so `auth()` resolves in Server Actions/Components even though nothing is `.protect()`-ed (D-01) |
| Save / rename / duplicate / delete a model | API/Backend (Server Actions) | Database (Neon via Drizzle) | Mutations must re-derive identity server-side and scope every query by `clerkUserId`; never trust client-supplied ownership |
| Load a model / list a user's models | API/Backend (Server Component data read via a plain async query function) | Database | Reads belong in Server Components per Next.js 16 guidance, not Server Actions (which are for mutations) |
| Design snapshot validation (shape check before write) | API/Backend (Zod schema beside the Drizzle schema) | — | Boundary validation (ASVS V5); belongs next to persistence code, not in `lib/geometry` (Rule 1 forbids DB-adjacent code there) |
| Autosave trigger + "Saved" tick | Browser (client-side debounce inside `DesignProvider`) | API/Backend (the same save Server Action) | The debounce timer and dirty-tracking are pure client state; the actual write is still server-authorized |
| Board rack cards, sign-in dialog, name/confirm dialogs | Browser (client components, shadcn `Dialog`) | — | Pure presentation/interaction; no design math involved |

## Standard Stack

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| `@clerk/nextjs` | 7.8.2 [VERIFIED: npm registry] | Auth (sign-up/in, session, password reset, Google OAuth) | Prescribed in CLAUDE.md; official Next.js App Router SDK |
| `drizzle-orm` | 0.45.2 [VERIFIED: npm registry] | Type-safe SQL query builder / schema | Prescribed in CLAUDE.md; ~60KB, first-class serverless/edge support [ASSUMED] |
| `drizzle-kit` | 0.31.10 [VERIFIED: npm registry] | Schema migration generation/push (dev dependency) | Companion CLI to drizzle-orm, same maintainers |
| `@neondatabase/serverless` | 1.1.0 [VERIFIED: npm registry] | HTTP-based Postgres driver for Neon | Required for Vercel serverless/edge functions — a normal `pg` TCP pool doesn't survive Vercel's per-invocation lifecycle [CITED: neon.com/guides] |

### Supporting
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| `zod` | current (already installed nowhere; verify at plan time) [VERIFIED: npm registry — exists, OK verdict] | Validate the design snapshot's shape before it's written to `jsonb`, and validate Server Action inputs | Any place untrusted input (client-controlled `FormData`/JSON) crosses into a DB write (ASVS V5) |

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| Server Actions for all CRUD | Route Handlers (`app/api/models/route.ts`) | Route Handlers suit non-mutation or externally-consumed endpoints; this phase has no external consumer, so Server Actions keep everything colocated with the calling component [CITED: next.js docs, server-actions.md] |
| A local `users` table synced via Clerk webhook | Store `clerkUserId` directly on `models`, no local user mirror | Webhook sync adds infra (a webhook endpoint, retry handling) for zero MVP benefit — nothing here needs profile data beyond what Clerk already provides [ASSUMED, but low risk: standard pattern for apps with no extra per-user app data] |
| `drizzle-kit push` in production | `drizzle-kit generate` + `drizzle-kit migrate` | `push` is fine for local iteration but bypasses the migration-file history; a reviewable migration file is worth the extra step for a schema a shaper's data depends on [CITED: orm.drizzle.team/docs/kit-overview, fetched directly 2026-08-27] |

**Installation:**
```bash
npm install @clerk/nextjs drizzle-orm @neondatabase/serverless zod
npm install -D drizzle-kit
```

**Version verification:** Checked live via `npm view <pkg> version` on 2026-08-27 (see Package Legitimacy Audit below for publish dates and the caveat on `@clerk/nextjs`'s release cadence).

## Package Legitimacy Audit

| Package | Registry | Age (latest publish) | Downloads/wk | Source Repo | Verdict | Disposition |
|---------|----------|-----------------------|--------------|-------------|---------|-------------|
| `@clerk/nextjs` | npm | 2 days (7.8.2, 2026-08-25) | 2,176,205 | github.com/clerk/javascript | **SUS** (`too-new`) | Flagged — see note below; planner must add `checkpoint:human-verify` before install |
| `drizzle-orm` | npm | ~5 months | 20,168,692 | github.com/drizzle-team/drizzle-orm | OK | Approved |
| `drizzle-kit` | npm | ~5 months | 16,766,877 | github.com/drizzle-team/drizzle-orm | OK | Approved |
| `@neondatabase/serverless` | npm | ~4 months | 3,620,124 | github.com/neondatabase/serverless | OK | Approved |
| `zod` | npm | ~4 months | 273,858,187 | github.com/colinhacks/zod | OK | Approved |

**Packages removed due to `[SLOP]` verdict:** none.
**Packages flagged as suspicious `[SUS]`:** `@clerk/nextjs`.

**Note on the `@clerk/nextjs` SUS flag:** the legitimacy check's "too-new" signal fires on the *latest publish date*, not on the package's overall trust signals. `npm view @clerk/nextjs versions` shows Clerk cuts canary builds multiple times per day (8 canary tags in the 48 hours before this research) — this is an actively-maintained official SDK with 2.1M weekly downloads and a matching GitHub org, not a slopsquat candidate. The verdict is very likely a false positive from the heuristic, but per protocol it is still tagged `[SUS]` and the planner must insert a `checkpoint:human-verify` task before `npm install @clerk/nextjs` — the check itself is cheap (confirm the installed version resolves from `github.com/clerk/javascript` and matches what `npm view @clerk/nextjs version` reports at install time).

*The `zod` version number itself was not pinned above — verify the exact current version at plan/execute time with `npm view zod version`; the legitimacy check confirmed it exists and is `OK`, not a specific number.*

## Architecture Patterns

### System Architecture Diagram

```
Browser (client components)
  │
  │  1. Anonymous shaping — untouched, no network calls (D-01)
  │     DesignProvider (React context) — unchanged from Phase 1
  │
  │  2. "Sign in" click → shadcn Dialog renders Clerk <SignIn>/<SignUp>
  │     └─▶ Clerk's hosted API (email/password, Google OAuth, reset email)
  │           └─▶ session cookie set; ClerkProvider context updates client-side
  │
  │  3. "Save" click (first time) → name prompt (if unnamed) → Server Action `saveModel()`
  │     "Save" tick (autosave, after first save) → debounced Server Action `saveModel()`
  ▼
proxy.ts  (clerkMiddleware() — establishes auth() context, protects NOTHING — D-01)
  │
  ▼
Server Actions (app/design/actions.ts or similar, 'use server')
  │  - auth() → userId (throw/return-early if absent)
  │  - Zod-validate the incoming DesignState snapshot
  │  - Drizzle query, ALWAYS scoped by `eq(models.clerkUserId, userId)`
  ▼
Drizzle (drizzle-orm/neon-http) ──▶ Neon Postgres (models table: id, clerkUserId, name, snapshot jsonb, timestamps)

Home page (app/page.tsx, Server Component)
  │  - await auth() → userId
  │  - if userId: await listModels(userId)  [plain async fn, not a Server Action — it's a read]
  │  - pass models[] as props into <SetupScreen models={...} />
  ▼
SetupScreen (client) renders rack cards ABOVE preset cards (D-06/D-07) when models.length or in-progress board exists
  │  - clicking a rack card → Server Action `loadModel(id)` → returns validated snapshot
  │  - `applyModel(snapshot)` on DesignProvider (same shape as today's `applyPreset`)
  │  - router.push('/design/outline')
```

### Recommended Project Structure
```
proxy.ts                          # clerkMiddleware(), no .protect() calls (replaces middleware.ts — Next 16)
lib/
├── geometry/                     # UNCHANGED — no DB/React imports ever added here (Rule 1)
├── db/
│   ├── client.ts                 # drizzle(neon(process.env.DATABASE_URL))
│   └── schema.ts                 # pgTable("models", {...})
└── models/
    ├── design-snapshot.ts        # Zod schema + pure serialize/validate fns for DesignState (unit-tested, picked up by vitest's lib/**/*.test.ts)
    └── design-snapshot.test.ts
app/
├── design/
│   └── actions.ts                 # 'use server' — saveModel, renameModel, duplicateModel, deleteModel
├── page.tsx                       # Server Component: auth() + listModels(), passes to SetupScreen
components/
├── setup/
│   ├── board-rack.tsx             # NEW — the rack section (D-06/D-07/D-12)
│   ├── board-rack-card.tsx        # NEW — thumbnail + name + dims/volume + last-touched + menu (D-12/D-13)
│   └── ...existing preset/continue/replace-dialog files, updated copy
├── site-nav.tsx                   # gains Sign in / avatar / Save / "Saved" tick (D-02, D-05, D-08)
└── auth/
    └── sign-in-dialog.tsx         # NEW — shadcn Dialog wrapping Clerk's <SignIn>/<SignUp>
```

### Pattern 1: Open proxy, no route gating
**What:** `clerkMiddleware()` runs on every route (broad matcher) but no route calls `.protect()`. `auth()` is available everywhere; it simply resolves `userId: null` for anonymous visitors.
**When to use:** Exactly this phase's shape — D-01 requires the whole app stay usable anonymously.
**Example:**
```typescript
// Source: https://clerk.com/docs/reference/nextjs/clerk-middleware (fetched 2026-08-27)
// proxy.ts — Next.js 16 renamed middleware.ts to proxy.ts; the exported function name and
// clerkMiddleware() call are unchanged, only the filename/export changed.
import { clerkMiddleware } from '@clerk/nextjs/server'

export default clerkMiddleware()

export const config = {
  matcher: [
    '/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico)).*)',
    '/(api|trpc)(.*)',
  ],
}
```

### Pattern 2: Ownership-scoped Server Action (never trust client-supplied identity)
**What:** Every mutation re-derives `userId` from `auth()` server-side and scopes the query by it — the client only ever sends a row reference (an `id`), never an owner.
**When to use:** All of `saveModel`, `renameModel`, `duplicateModel`, `deleteModel`.
**Example:**
```typescript
// Source: https://clerk.com/docs/reference/nextjs/app-router/server-actions (fetched 2026-08-27)
// combined with https://nextjs.org/docs (server-actions.md) ownership-check pattern
'use server'
import { auth } from '@clerk/nextjs/server'
import { db } from '@/lib/db/client'
import { models } from '@/lib/db/schema'
import { and, eq } from 'drizzle-orm'
import { designSnapshotSchema } from '@/lib/models/design-snapshot'

export async function renameModel(modelId: string, name: string) {
  const { userId } = await auth()
  if (!userId) throw new Error('Sign in to rename a board.')

  const trimmed = name.trim()
  if (!trimmed) throw new Error('Board needs a name.')

  await db
    .update(models)
    .set({ name: trimmed, updatedAt: new Date() })
    .where(and(eq(models.id, modelId), eq(models.clerkUserId, userId)))
}
```

### Pattern 3: Drizzle schema for the design snapshot
**What:** One table. No local `users` table — Clerk owns identity.
**Example:**
```typescript
// Source: https://orm.drizzle.team/docs/column-types/pg and
// https://orm.drizzle.team/docs/indexes-constraints (fetched 2026-08-27)
import { pgTable, text, uuid, jsonb, timestamp, index } from 'drizzle-orm/pg-core'

export const models = pgTable('models', {
  id: uuid('id').defaultRandom().primaryKey(),
  clerkUserId: text('clerk_user_id').notNull(),
  name: text('name').notNull(),
  // The full DesignState snapshot (D-11) — outline, rails, fins, volume, boardName, finSystem,
  // finsImportTemplate. Branded Mm/Degrees/Litres values are plain numbers at runtime, so no
  // custom (de)serializer is needed; Zod validates shape on the way in.
  snapshot: jsonb('snapshot').notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
}, (table) => [
  index('models_clerk_user_id_idx').on(table.clerkUserId),
])
```

### Pattern 4: Neon connection (HTTP driver, no pool)
**What:** `drizzle-orm/neon-http` + `@neondatabase/serverless`'s `neon()` — an HTTP call per query, not a persistent TCP connection. This is the only driver that survives Vercel's per-invocation serverless lifecycle without connection-pool exhaustion.
**Example:**
```typescript
// Source: https://orm.drizzle.team/docs/tutorials/drizzle-with-vercel-edge-functions (fetched 2026-08-27)
import { drizzle } from 'drizzle-orm/neon-http'
import { neon } from '@neondatabase/serverless'

const sql = neon(process.env.DATABASE_URL!)
export const db = drizzle(sql)
```

### Anti-Patterns to Avoid
- **Calling `auth.protect()` anywhere in this phase:** violates D-01 outright, and a known open bug (`clerk/javascript#8302`) makes `.protect()` redirect to the *current* page instead of sign-in inside Next.js 16's Node proxy runtime when `NEXT_PUBLIC_CLERK_SIGN_IN_URL` isn't resolved — moot here since nothing should be protected, but worth knowing if a later phase adds gating.
- **A local `users` table kept in sync via Clerk webhooks:** unnecessary infrastructure for an MVP with no extra per-user data — store `clerkUserId` directly.
- **`drizzle-kit push` as the production deploy step:** bypasses the reviewable migration-file history; use `generate` + `migrate`.
- **Trusting a client-sent `userId`/`ownerId` field on a save/rename/delete payload:** the Next.js 16 docs explicitly call this out — always re-derive from `auth()` and re-check ownership server-side, never accept it as part of the mutation's input shape.
- **Using a plain `pg` TCP pool for the Postgres connection:** works locally, breaks (or badly under-performs) on Vercel serverless functions — use the Neon HTTP driver.

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Password hashing, session tokens, password-reset email delivery | A custom `bcrypt` + JWT + transactional-email pipeline | Clerk (`@clerk/nextjs`) | This is exactly the class of problem CLAUDE.md prescribes Clerk for; rolling it yourself reintroduces every OWASP auth pitfall (timing attacks, token replay, reset-link expiry) that Clerk has already solved |
| Google OAuth token exchange | A hand-rolled OAuth 2.0 flow against Google's endpoints | Clerk's Google social connection | Clerk owns the redirect URIs, token refresh, and account-linking edge cases (e.g. an existing email/password account signing in with Google later) |
| DB schema migrations | Hand-written `ALTER TABLE` scripts run manually | `drizzle-kit generate` + `drizzle-kit migrate` | Guarantees a reviewable, ordered migration history instead of undocumented manual DDL |
| JSON shape validation before a DB write | Manual `if (!obj.outline) throw ...` checks | Zod schema | One declarative source of truth for what a valid snapshot looks like, reusable on both the write path and (if ever needed) a data-repair script |

**Key insight:** Every piece of "don't hand-roll" here maps directly to something the founder's build guide already named (Clerk, Drizzle) — the risk in this phase isn't picking the wrong library, it's wiring the *seams* between them (auth context in Server Actions, ownership scoping, snapshot validation) correctly.

## Common Pitfalls

### Pitfall 1: `middleware.ts` silently not running under Next.js 16
**What goes wrong:** Following older Clerk tutorials (or training-data memory) produces a `middleware.ts` file. On Next.js 16 this file convention is deprecated; depending on exact version behavior, `auth()` calls elsewhere in the app then fail with "Clerk can't detect usage of clerkMiddleware()".
**Why it happens:** Next.js 16.0 renamed the convention to `proxy.ts` — a change newer than most training data and most existing Clerk blog posts.
**How to avoid:** Create `proxy.ts` (not `middleware.ts`) at the project root, exporting `clerkMiddleware()` as the default export, per Pattern 1 above. [VERIFIED: node_modules/next/dist/docs/01-app/03-api-reference/03-file-conventions/proxy.md:1-13 — "The `middleware` file convention is deprecated and has been renamed to `proxy`."]
**Warning signs:** `auth()` returns an error or always resolves to a signed-out state even after a successful Clerk sign-in.

### Pitfall 2: Confusing "no route gating" with "no auth() calls needed"
**What goes wrong:** Someone skips `clerkMiddleware()` entirely on the reasoning that "the app doesn't protect any routes." `auth()` then throws in every Server Action because Clerk has no request-scoped context to read.
**Why it happens:** `clerkMiddleware()`'s job is establishing auth *context*, not just gating routes — those are separable concerns, and D-01's "stay fully open" decision only argues against the gating half.
**How to avoid:** Always include `clerkMiddleware()` in `proxy.ts` with a broad matcher; simply never call `.protect()`.
**Warning signs:** "auth() was called but Clerk can't detect usage of clerkMiddleware()" error at runtime.

### Pitfall 3: Trusting client input for ownership on mutations
**What goes wrong:** A `saveModel(model: { id, clerkUserId, name, snapshot })` action takes the whole object from the client, including `clerkUserId` — a malicious or buggy client can then write/overwrite another user's row.
**Why it happens:** It's the path of least resistance when the client already has the full `DesignState` object in memory.
**How to avoid:** Server Actions accept only the *changed* fields plus a row reference (`id`); identity always comes from `await auth()` inside the action, and every `WHERE` clause includes `eq(models.clerkUserId, userId)`. [CITED: node_modules/next/dist/docs/01-app/02-guides/server-actions.md:113-138 — the "Unsafe … Safe" example pair]
**Warning signs:** A mutation function's parameter list includes anything resembling `userId`/`ownerId`/`clerkUserId` as caller-supplied input.

### Pitfall 4: Stale "no persistence yet" copy left in the UI after this phase ships
**What goes wrong:** Existing code comments and one live dialog string ("This replaces your current board in progress. It hasn't been saved yet — saving arrives in Phase 2.") were written when there was no save feature. If left unchanged, the confirm dialog now actively lies to a shaper who *could* have saved.
**Why it happens:** These strings predate this phase and aren't obviously "in scope" for a persistence-focused plan.
**How to avoid:** Update `components/setup/replace-board-dialog.tsx`'s copy (and the `Phase 2` doc-comments in `design-store.tsx`, `site-nav.tsx`, `setup-screen.tsx`) as part of this phase's plan — the dialog text specifically needs new wording distinguishing "unsaved" (never saved) from "has unsaved edits" (autosave pending) per D-08/D-10.
**Warning signs:** grep for `"Phase 2"` or `"saving arrives"` after this phase ships and still finding hits.

### Pitfall 5: Google OAuth "works in dev, breaks in prod"
**What goes wrong:** Google sign-in works perfectly against the Vercel preview/dev Clerk instance (using Clerk's shared dev OAuth credentials), then fails once the app is on its production Clerk instance because Google requires the app's own OAuth client ID/secret in production.
**Why it happens:** Clerk transparently uses shared credentials in development instances only. [CITED: clerk.com/docs/guides/configure/auth-strategies/social-connections/google, fetched 2026-08-27 — "for production instances, you must provide custom credentials"]
**How to avoid:** Budget a task for creating a Google Cloud OAuth 2.0 client (client ID + secret) and entering it under Clerk Dashboard → SSO Connections → Google → "Use custom credentials" before the production Clerk instance goes live on the deployed domain. This is a non-code, user-owned prerequisite like the Clerk/Neon account creation already flagged in CONTEXT.md.
**Warning signs:** Google sign-in works on `localhost`/preview but errors (redirect_uri_mismatch or similar) on `shaper-coral.vercel.app`.

## Code Examples

### Autosave debounce (client-side dirty tracking)
```typescript
// Pattern only — no official source; standard React debounce-on-change idiom.
// Lives inside DesignProvider (or a sibling hook) once a model has an id/name (D-08).
// [ASSUMED — Claude's Discretion per CONTEXT.md: "Autosave debounce timing and failure
// handling (retry/quiet error state)" is explicitly left open]
useEffect(() => {
  if (!modelId) return; // anonymous / never-saved board — no autosave target (D-08)
  const timer = setTimeout(() => {
    startTransition(async () => {
      try {
        await saveModel(modelId, currentSnapshot);
        setSaveStatus('saved');
      } catch {
        setSaveStatus('error'); // quiet — no interrupting dialog
      }
    });
  }, 1500); // debounce window — tune during execution
  return () => clearTimeout(timer);
}, [modelId, currentSnapshot]);
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|---------------|--------|
| `middleware.ts` file convention | `proxy.ts` file convention (same `clerkMiddleware()` call, renamed export/file) | Next.js 16.0 | Any Clerk setup instructions written before Next 16 (most existing tutorials/training data) name the wrong file |
| `getAuth(req)` prop-drilled auth checks | `await auth()` async helper, usable directly in Server Components/Actions/Route Handlers | Clerk Core 2 (`@clerk/nextjs` v5+) | Simpler, no request object needed inside Server Actions |
| Hand-rolled Postgres TCP pooling for serverless | Neon's HTTP driver (`@neondatabase/serverless` + `drizzle-orm/neon-http`) | Ongoing Neon/Vercel ecosystem standard | Avoids connection-pool exhaustion under Vercel's per-invocation execution model |

**Deprecated/outdated:**
- `middleware.ts`: still functions in the short term per community reporting, but Clerk's own docs now lead with `proxy.ts` for Next.js 16+; treat `middleware.ts` as end-of-life for this project. [CITED: WebSearch of clerk.com/docs — "While middleware.ts is still supported for specific Edge runtime use cases in the short term, you should migrate to proxy.ts"]

## Assumptions Log

| # | Claim | Section | Risk if Wrong |
|---|-------|---------|---------------|
| A1 | Sign-in dialog should be a custom shadcn `Dialog` wrapping Clerk's `<SignIn>`/`<SignUp>` components (not Clerk's own `mode="modal"`) | Architecture Patterns / Summary | If the planner instead uses `mode="modal"`, the dialog will use Clerk's default chrome instead of the app's surf theme — a styling mismatch, not a functional bug. Confirm before locking the plan. |
| A2 | No local `users` table is needed; `clerkUserId` stored directly on `models` | Standard Stack (Alternatives), Architecture Patterns | If a later phase needs richer per-user data (billing tier is already v2-deferred per REQUIREMENTS.md), retrofitting a `users` table is a straightforward addition, not a rewrite — low risk |
| A3 | Autosave debounce window (~1.5s) and failure UI (quiet, no interrupting dialog) | Code Examples | CONTEXT.md explicitly delegates this to Claude's discretion — any reasonable debounce value is acceptable; only a UX regression (autosave that feels laggy or nags on failure) would be "wrong" |
| A4 | `zod` (unpinned exact version) is the validation library of choice | Standard Stack | If the planner prefers a different schema library (e.g. `valibot`), that's a substitution with equivalent safety properties, not a correctness risk |

## Open Questions

1. **Exact `zod` version to pin**
   - What we know: it exists on the registry and passed the legitimacy check with an `OK` verdict.
   - What's unclear: the specific current version number (not captured during this research pass).
   - Recommendation: run `npm view zod version` at plan/install time and pin that.

2. **Whether Clerk's Google OAuth "Use custom credentials" step blocks Phase 2 completion or can land after initial ship**
   - What we know: dev/preview works out of the box with Clerk's shared credentials; production requires the shaper's own Google Cloud OAuth client.
   - What's unclear: whether the founder wants Google sign-in live on day one of production, or is fine shipping email/password first and adding Google shortly after.
   - Recommendation: flag as a checkpoint during planning — either block the phase on the Google Cloud credential being created, or explicitly sequence "email/password ships first, Google follows."

## Environment Availability

| Dependency | Required By | Available | Version | Fallback |
|------------|------------|-----------|---------|----------|
| Node.js | Next.js dev/build | ✓ | v24.19.0 | — |
| npm | package installs | ✓ | 11.17.0 | — |
| Local PostgreSQL (`psql`) | Local DB access/inspection | ✗ | — | Use Neon's HTTP driver against a Neon dev branch instead of a local Postgres — the serverless driver works the same locally and in production, so no local Postgres install is actually needed |
| Vercel CLI | Local env-var pull / preview deploys | ✗ | — | Use the Vercel dashboard directly for env var configuration; not a blocker |
| Clerk account + application (publishable/secret keys) | ACCT-01..03 | ✗ (not yet created — user-owned) | — | **Blocks all auth work** — flagged in CONTEXT.md as a non-code prerequisite |
| Neon project (connection string) | MODL-01..03 | ✗ (not yet created — user-owned) | — | **Blocks all persistence work** — flagged in CONTEXT.md as a non-code prerequisite |
| Google Cloud OAuth client (production) | D-04 (Google sign-in in production) | ✗ (not yet created — user-owned) | — | Dev/preview works via Clerk's shared credentials with zero setup; only production needs this — see Pitfall 5 |

**Missing dependencies with no fallback:**
- Clerk account/application and Neon project must exist before any of this phase's code can be exercised end-to-end — these are user-owned prerequisites, not something the plan can install its way around.

**Missing dependencies with fallback:**
- Local PostgreSQL and Vercel CLI — both have viable fallbacks noted above.

## Validation Architecture

### Test Framework
| Property | Value |
|----------|-------|
| Framework | Vitest v4.1.11 [VERIFIED: package.json:26] |
| Config file | `vitest.config.ts` — `include: ["lib/**/*.test.ts"]`, `environment: "node"` [VERIFIED: vitest.config.ts:1-14] |
| Quick run command | `npm test -- lib/models/design-snapshot.test.ts` |
| Full suite command | `npm test` |

### Phase Requirements → Test Map
| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| MODL-01 | Design snapshot serializes/validates without loss (round-trip) | unit | `npm test -- lib/models/design-snapshot.test.ts` | ❌ Wave 0 |
| MODL-02 | Loading a snapshot reproduces the exact `DesignState` it came from | unit | `npm test -- lib/models/design-snapshot.test.ts` | ❌ Wave 0 |
| MODL-03 | Ownership scoping — a query for user A never returns user B's rows | integration (needs a real/ephemeral Neon branch) | manual or a dedicated integration script — **not** picked up by `lib/**/*.test.ts` | ❌ Wave 0, needs a decision on where DB-touching tests live |
| ACCT-01/02/03 | Sign-up, persistent session, password reset | manual-only | — (Clerk's hosted flows are not practically unit-testable without Clerk's own test-mode tooling) | — |

### Sampling Rate
- **Per task commit:** `npm test -- lib/models/design-snapshot.test.ts` (fast, no network)
- **Per wave merge:** `npm test` (full suite)
- **Phase gate:** Full suite green before `/gsd-verify-work`, plus manual UAT of the Clerk flows (sign-up, sign-in, sign-out-and-back-in for persistence, password reset email) and the save/reopen/list/rename/duplicate/delete flows against a real Neon branch

### Wave 0 Gaps
- [ ] `lib/models/design-snapshot.ts` + `lib/models/design-snapshot.test.ts` — Zod schema and round-trip serialize/validate tests for the full `DesignState` (MODL-01/02)
- [ ] Decide where ownership-scoped DB integration tests live — `vitest.config.ts`'s `include` pattern is `lib/**/*.test.ts` only, so a Server Action test under `app/` won't run automatically; either widen the include pattern or keep all DB-query logic in a `lib/db/queries.ts` module (which *would* be picked up) and let Server Actions be thin wrappers
- [ ] `.env.local.example` documenting `DATABASE_URL`, `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY`, `CLERK_SECRET_KEY` — none exists yet (no `.env*` file currently in the repo)
- [ ] `drizzle.config.ts` — does not exist yet, needed before `drizzle-kit generate`/`migrate` will run

## Security Domain

### Applicable ASVS Categories

| ASVS Category | Applies | Standard Control |
|---------------|---------|-----------------|
| V2 Authentication | yes | Clerk (`@clerk/nextjs`) — password hashing, MFA-capable, session management all handled by Clerk, not hand-rolled |
| V3 Session Management | yes | Clerk session cookies + `clerkMiddleware()`; no custom session token logic |
| V4 Access Control | yes | Every Server Action re-derives `userId` from `await auth()` and scopes every query by `eq(models.clerkUserId, userId)` — see Pattern 2 and Pitfall 3 |
| V5 Input Validation | yes | Zod schema validates the `DesignState` snapshot shape and Server Action inputs before any DB write |
| V6 Cryptography | yes | No custom cryptography anywhere — Clerk owns password hashing and token signing entirely |

### Known Threat Patterns for this stack

| Pattern | STRIDE | Standard Mitigation |
|---------|--------|---------------------|
| IDOR — a shaper edits another shaper's model by guessing/reusing its `id` | Tampering / Elevation of Privilege | Every mutation and read scopes its `WHERE` clause by `clerkUserId` derived from `auth()`, never by a client-supplied owner field (Pattern 2) |
| CSRF against a Server Action | Tampering | Framework-level: Next.js 16 compares `Origin` to `Host`/`X-Forwarded-Host` automatically on Server Action POSTs [CITED: node_modules/next/dist/docs/01-app/02-guides/server-actions.md:76-85] — no extra app code needed, but don't disable/misconfigure `serverActions.allowedOrigins` |
| Oversized/malformed snapshot payload | Denial of Service | Server Actions default to a 1MB body limit [CITED: server-actions.md:83]; a `DesignState` snapshot is small (a handful of numbers/strings), so the default is more than sufficient — do not raise `bodySizeLimit` for this feature |
| Auth bypass via stale/rotated Server Action IDs after deploy | — (availability, not a security bypass) | Next.js rotates action IDs on redeploy; surface "Failed to find Server Action" as a retry-prompt in the UI rather than a silent failure [CITED: server-actions.md:172-180] |

## Sources

### Primary (HIGH confidence)
- `node_modules/next/dist/docs/01-app/03-api-reference/03-file-conventions/proxy.md` — proxy.js/middleware.js rename, matcher syntax, execution order (read directly from the installed Next.js 16.3.1 package, 2026-08-27)
- `node_modules/next/dist/docs/01-app/02-guides/server-actions.md` — Server Action security model, CSRF, body size limit, ownership-check example, deployment/action-ID rotation
- npm registry (`npm view`) — `@clerk/nextjs` 7.8.2, `drizzle-orm` 0.45.2, `drizzle-kit` 0.31.10, `@neondatabase/serverless` 1.1.0, `zod` (exists, OK) — checked 2026-08-27
- `gsd-tools query package-legitimacy check` — verdicts for all five packages, checked 2026-08-27

### Secondary (MEDIUM confidence)
- clerk.com/docs/reference/nextjs/clerk-middleware — proxy.ts setup code, matcher config (fetched via WebFetch, 2026-08-27)
- clerk.com/docs/nextjs/getting-started/quickstart — App Router quickstart, `clerk init`, ClerkProvider layout code (fetched via WebFetch, 2026-08-27)
- clerk.com/docs/reference/nextjs/app-router/server-actions — `auth()`/`isAuthenticated` Server Action pattern (fetched via WebFetch, 2026-08-27)
- clerk.com/docs/reference/nextjs/errors/auth-was-called — why `clerkMiddleware()` is required for `auth()` even with no protected routes (fetched via WebFetch, 2026-08-27)
- clerk.com/docs/guides/configure/auth-strategies/social-connections/google — dev shared credentials vs. production custom-credentials requirement (WebSearch, 2026-08-27)
- orm.drizzle.team/docs/column-types/pg, orm.drizzle.team/docs/indexes-constraints, orm.drizzle.team/docs/tutorials/drizzle-with-vercel-edge-functions, orm.drizzle.team/docs/kit-overview — Drizzle pg-core column/index syntax, Neon HTTP driver setup, and the push-vs-generate/migrate production recommendation (fetched via WebFetch, 2026-08-27)
- github.com/clerk/javascript/issues/8302 — open bug, `auth.protect()` mis-redirecting in Next.js 16 proxy runtime (fetched via WebFetch, 2026-08-27)

### Tertiary (LOW confidence)
- General WebSearch results on "Drizzle + Neon + Vercel 2026 stack" blog posts (stacknotice.com, pkgpulse.com) — used only for general orientation, not cited for specific claims above beyond the push-vs-migrate convention, which was cross-checked against orm.drizzle.team's own docs

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH — all four core packages verified on the npm registry with live version/download/repo data; versions cross-checked against official docs
- Architecture: MEDIUM-HIGH — the proxy.ts/middleware.ts rename and Server Action ownership pattern are directly sourced from the installed Next.js package's own docs and Clerk's current docs; the exact sign-in-dialog implementation (custom Dialog vs. Clerk's `mode="modal"`) is a judgment call flagged as an assumption (A1)
- Pitfalls: MEDIUM-HIGH — Pitfalls 1, 2, 3, 5 are sourced from official docs/a live GitHub issue; Pitfall 4 (stale copy) is a direct code-grep finding in this repo

**Research date:** 2026-08-27
**Valid until:** 2026-09-13 (~2.5 weeks) — shorter than the usual 30-day window because Next.js 16 and `@clerk/nextjs` are both moving fast right now (Clerk ships canary builds multiple times daily; Next.js just renamed a core file convention), so package versions and doc details here should be re-checked if planning slips more than a couple of weeks.
