# Phase 2 — External API Coverage Matrix

**Generated:** 2026-08-27 (planning)
**Detector:** `api-coverage.cjs` returned `detected: true` on the produced plan bodies
(signals: `sdk` in "the real Clerk SDK", `api` in "From API keys")

This phase integrates three external services. Full coverage is the default: every capability
either lands in a plan (`INTEGRATE`) or carries a one-line reason for staying out
(`OPT-OUT`). Nothing is left unstated.

---

## Clerk (`@clerk/nextjs` 7.8.2)

Capability surface as used by ACCT-01, ACCT-02, ACCT-03 and by the ownership scoping that
MODL-01..03 depend on.

| Capability | Disposition | Plan | Note |
|------------|-------------|------|------|
| Email + password sign-up (`<SignUp>`) | INTEGRATE | 02-01 T3 | ACCT-01; rendered inside the app's own Dialog |
| Email + password sign-in (`<SignIn>`) | INTEGRATE | 02-01 T3 | ACCT-02 |
| Forgot-password / reset by emailed link | INTEGRATE | 02-01 T2 (dashboard), 02-01 T3 (flow), 02-06 T3 (live check) | ACCT-03; Clerk hosts the email, no app code sends it |
| Session persistence across browser restarts | INTEGRATE | 02-01 T3 | ACCT-02; Clerk's default session lifetime, unmodified |
| `clerkMiddleware()` request-scoped auth context | INTEGRATE | 02-01 T3 | Required for `auth()` in Server Actions and Server Components even though nothing is gated |
| `auth()` server-side identity | INTEGRATE | 02-01 T5, 02-04 T1 | The sole source of ownership on every mutation and read |
| `useAuth` / `useUser` client-side signed-in state | INTEGRATE | 02-02 T2, 02-05 T1 | Gates autosave and the sign-in banner |
| `<UserButton>` avatar + sign-out | INTEGRATE | 02-01 T3 | The signed-in half of the nav auth control |
| `<ClerkLoading>` / `<ClerkLoaded>` | INTEGRATE | 02-01 T3 | Holds the nav slot so a signed-in shaper never sees a "Sign in" flash |
| Google social connection (development, shared credentials) | INTEGRATE | 02-01 T2 | D-04 |
| Google social connection (production, custom credentials) | INTEGRATE | 02-06 T1 | D-04; production will not work on Clerk's shared credentials |
| Production instance + domain registration | INTEGRATE | 02-06 T1 | Development keys are rejected on the deployed domain |
| Route protection (`auth.protect()`, `createRouteMatcher`) | OPT-OUT | — | D-01 keeps every route open; `lib/auth/open-access.test.ts` fails if a guard ever appears |
| Organizations / teams | OPT-OUT | — | Single-shaper accounts only in v1; no shared boards until sharing ships (SHAR2-01, v2) |
| Multi-factor authentication | OPT-OUT | — | Not requested; Clerk can enable it later as dashboard config with no code change |
| Clerk webhooks + a local `users` mirror table | OPT-OUT | — | No per-user app data beyond what Clerk holds; RESEARCH A2 records that retrofitting is an addition, not a rewrite |
| Clerk Billing / paid tiers | OPT-OUT | — | ACCT2-01 is explicitly a v2 requirement, out of this milestone |
| `<UserProfile>` account-management page | OPT-OUT | — | `<UserButton>`'s built-in menu already reaches account management; no dedicated route is in scope |
| Clerk-hosted sign-in pages / `mode="modal"` chrome | OPT-OUT | — | D-03 puts sign-in in a dialog over the design screen in the app's own surf theme (RESEARCH A1) |

## Neon Postgres (`@neondatabase/serverless` 1.1.0 + `drizzle-orm` 0.45.2 / `drizzle-kit` 0.31.10)

Capability surface as used by MODL-01, MODL-02, MODL-03.

| Capability | Disposition | Plan | Note |
|------------|-------------|------|------|
| HTTP driver connection (`neon()` + `drizzle-orm/neon-http`) | INTEGRATE | 02-01 T4 | A TCP pool does not survive Vercel's per-invocation lifecycle |
| `models` table schema (`pgTable`) | INTEGRATE | 02-01 T4 | One row per saved board; no local users table |
| Index on the owning-user column | INTEGRATE | 02-01 T4 | Every query filters on it, so it is the one index that earns its place |
| `jsonb` column for the design snapshot | INTEGRATE | 02-01 T4 | D-11; branded metric values are plain numbers at runtime |
| Insert (first save) | INTEGRATE | 02-01 T5 | MODL-01 |
| Update scoped by id + owner (subsequent saves, autosave, rename) | INTEGRATE | 02-01 T5, 02-02 T2, 02-04 T1 | D-09; the both-column WHERE is the access-control story |
| Select scoped by owner, ordered by last touched | INTEGRATE | 02-01 T5, 02-03 T1 | MODL-03 |
| Delete scoped by id + owner | INTEGRATE | 02-04 T1 | D-13 |
| `drizzle-kit generate` — reviewable migration file | INTEGRATE | 02-01 T4 | Preferred over a direct push so the schema a shaper's data depends on has a readable history |
| `drizzle-kit migrate` — apply to development branch | INTEGRATE | 02-01 T4 | Blocking; a green build hides a missing table |
| Apply to the production branch | INTEGRATE | 02-06 T2 | Blocking; development and production are different branches |
| Neon branching for previews | OPT-OUT | — | One development branch and one production branch is all this phase needs; per-preview branches are deployment tooling, not a phase requirement |
| Connection pooling configuration / `pg` pool tuning | OPT-OUT | — | The HTTP driver has no pool to tune |
| Row-level security policies | OPT-OUT | — | Ownership is enforced in the query layer and guarded by `lib/db/ownership.test.ts`; RLS would need a per-request Postgres role this architecture does not establish |
| Full-text search / additional indexes | OPT-OUT | — | No search over boards in v1; the rack is one shaper's own short list |
| Transactions across multiple rows | OPT-OUT | — | Every mutation in this phase touches exactly one row, so single-statement atomicity is sufficient |
| Neon read replicas | OPT-OUT | — | Read volume is one small query per home-page render |

## Google OAuth (via Clerk, not called directly)

| Capability | Disposition | Plan | Note |
|------------|-------------|------|------|
| Google as a sign-in provider | INTEGRATE | 02-01 T2, 02-06 T1 | D-04 |
| OAuth 2.0 Web client + authorized redirect URI | INTEGRATE | 02-06 T1 | Production only; development uses Clerk's shared credentials |
| Direct token exchange / refresh handling | OPT-OUT | — | Clerk owns the redirect URIs, token refresh and account-linking edge cases; hand-rolling this is explicitly on RESEARCH's "Don't Hand-Roll" list |
| Google API scopes beyond basic profile | OPT-OUT | — | Nothing in this app reads a shaper's Google data; identity only |

---

## Framework-level surfaces this phase relies on but does not configure

| Surface | Disposition | Note |
|---------|-------------|------|
| Server Action CSRF (Origin vs Host check) | INTEGRATE (default behaviour) | Automatic; `serverActions.allowedOrigins` is deliberately left unset |
| Server Action 1MB body limit | INTEGRATE (default behaviour) | A snapshot is a few hundred bytes; the limit is deliberately not raised |
| Server Action id rotation on redeploy | INTEGRATE | 02-02 T2 surfaces the resulting failure as a retryable "Not saved" rather than a silent no-op |
