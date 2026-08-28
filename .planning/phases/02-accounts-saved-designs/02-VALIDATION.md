---
phase: 2
slug: accounts-saved-designs
# status lifecycle: draft (seeded by plan-phase) → validated (set by validate-phase §6)
# audit-milestone §5.5 distinguishes NOT-VALIDATED (draft) from PARTIAL (validated + nyquist_compliant: false) (#2117)
status: validated
nyquist_compliant: false
wave_0_complete: true
created: 2026-08-27
validated: 2026-08-27
---

# Phase 2 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | vitest (installed, `lib/**/*.test.ts`, node environment) |
| **Config file** | vitest.config.ts |
| **Quick run command** | `npm test` |
| **Full suite command** | `npm test && npm run lint && npm run build` |
| **Estimated runtime** | ~60 seconds |

---

## Sampling Rate

- **After every task commit:** Run `npm test`
- **After every plan wave:** Run `npm test && npm run lint && npm run build`
- **Before `/gsd-verify-work`:** Full suite must be green
- **Max feedback latency:** 90 seconds

---

## Per-Task Verification Map

One row per task actually executed across all six plans of this phase. `File Exists` marks whether the row's own automated test file is present on disk; `Status` reflects what was actually run, not what the plan originally asked for.

| Task ID | Plan | Wave | Requirement | Threat Ref | Secure Behavior | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|------------|-----------------|-----------|-------------------|-------------|--------|
| 01-T1 | 02-01 | 1 | — | — | `@clerk/nextjs` package-legitimacy confirmation before install | manual (checkpoint:human-verify) | — | n/a | ✅ approved |
| 01-T2 | 02-01 | 1 | — | — | Clerk application + Neon project created, `.env.local` populated | manual (checkpoint:human-action) | — | n/a | ✅ done |
| 01-T3 | 02-01 | 1 | ACCT-01, ACCT-02 | — | `proxy.ts` runs `clerkMiddleware()` with no `.protect()` call anywhere — sign-in stays a nudge, never a gate (D-01) | unit (source-contract) | `npm test -- lib/auth/open-access.test.ts` | ✅ | ✅ green |
| 01-T4 | 02-01 | 1 | MODL-01 | — | `models` table + Drizzle client stood up; snapshot boundary validates every design on the way in/out | unit | `npm test -- lib/models/design-snapshot.test.ts lib/geometry/design.test.ts` | ✅ | ✅ green |
| 01-T5 | 02-01 | 1 | MODL-01, MODL-02, MODL-03 | T-02-03 (Elevation of Privilege, cross-account access) | One board saved, listed and reopened end to end (tracer); every Drizzle statement touching `models` constrains on the owning-user column | unit (TDD, source-contract) | `npm test -- lib/db/ownership.test.ts` | ✅ | ✅ green (RED `7dfebc7` → GREEN `34d0137`) |
| 02-T1 | 02-02 | 2 | MODL-01 | — | `decideAutosave`/`nextStatusAfter` — every autosave gate (signed out, never saved, in flight, not dirty) decided by one pure tested function; a rejected save can never map to "saved" | unit (TDD) | `npm test -- lib/models/autosave.test.ts` | ✅ | ✅ green (RED `ff800af` → GREEN `8e170e9`) |
| 02-T2 | 02-02 | 2 | MODL-01 | — | `dirty`/`saveStatus` tracked alongside every mutator; autosave effect debounces 1200ms and writes via `saveModel` | unit + build | `npm test && npx tsc --noEmit` | n/a (covered by 02-T1's tests) | ✅ green |
| 02-T3 | 02-02 | 2 | MODL-02 | — | Nav's four save states (Save/Saving…/Saved/Not saved); "Saved" only ever follows a confirmed write; failed save retries in one click, no dialog | unit (grep acceptance criteria) + build | `npm run lint && npx tsc --noEmit` | n/a | ✅ green |
| 03-T1 | 02-03 | 2 | MODL-03 | — | `sortRackEntries` — in-progress board always first, saved boards most-recently-touched first, deterministic tiebreak, no input mutation | unit (TDD) | `npm test -- lib/models/rack-order.test.ts` | ✅ | ✅ green (RED `776a014` → GREEN `362641d`) |
| 03-T2 | 02-03 | 2 | MODL-03 | — | Home screen composes one ordered rack (in-progress + saved) above the preset grid | unit + build | `npm test && npx tsc --noEmit && npm run build` | n/a | ✅ green |
| 03-T3 | 02-03 | 2 | MODL-03 | — | A corrupt row is dropped and logged without breaking the rest of the rack; a failed/slow board-list read degrades to the plain preset grid, not a spinner | unit (grep acceptance criteria) | `npm run lint` | n/a | ✅ green |
| 04-T1 | 02-04 | 3 | MODL-01 | T-02-03 (Elevation of Privilege) | `renameModel`/`duplicateModel`/`deleteModel` — each re-derives the caller from the session, scopes every query by row id + `clerk_user_id`; `app/design/actions.ts` exports exactly the four expected actions | unit (TDD, source-contract) | `npm test -- lib/db/ownership.test.ts` | ✅ | ✅ green (RED `8d0d0a2` → GREEN `46c33c5`) |
| 04-T2 | 02-04 | 3 | MODL-03 | — | Rack-card menu (Rename/Duplicate/Delete) built on the app's one Base UI menu pattern; Delete in the destructive color | unit (grep acceptance criteria) + build | `npx tsc --noEmit && npm run lint` | n/a | ✅ green |
| 04-T3 | 02-04 | 3 | MODL-01, MODL-03 | — | Rename blocked inline on empty name; Duplicate instant with a retryable failure affordance; Delete behind a naming confirm; deleting the open board clears `modelId` | unit + build | `npm test && npx tsc --noEmit && npm run lint && npm run build` | n/a | ✅ green — post-fix `6958df6` (rename was leaving the old name embedded in the stored snapshot; now rewrites both) |
| 05-T1 | 02-05 | 3 | ACCT-02 | T-02-14, T-02-15 (banner never a gate; no overlay) | `shouldShowSignInBanner` covers all four signed-in/dismissed combinations; storage helpers never throw on missing/blocked storage | unit (TDD) | `npm test -- lib/models/banner-dismissal.test.ts` | ✅ | ✅ green (RED `ac91b00` → GREEN `b689082`) |
| 05-T2 | 02-05 | 3 | ACCT-01 | T-02-16 (stale-copy sweep) | No copy anywhere still tells a shaper that saving is a future phase | unit (grep) | `grep -rnE "Phase 2\|saving arrives\|no persistence" app/ components/ lib/` (exit 1 required) | n/a | ✅ green |
| 06-T1 | 02-06 | 4 | ACCT-01, ACCT-02, ACCT-03 (D-04 Google) | T-02-17 (dev keys in prod), T-02-18 (Google redirect mismatch) | Production Clerk instance, custom Google OAuth credentials, and all three secrets in Vercel Production | manual (checkpoint:human-action) | — | n/a | ✅ done — plus two post-checkpoint fixes: `444c58b` (Clerk's own `/__clerk/*` traffic was 404ing behind `proxy.ts`'s matcher on the `*.vercel.app` domain) and the user re-pasting Google's custom client_id/secret after Clerk showed empty credentials |
| 06-T2 | 02-06 | 4 | MODL-01..03 | T-02-08 (secret disclosure), T-02-19 (unmigrated prod DB) | Production database reachable and migrated; no secret entered the repo | read-only verification + automated | `npx vercel env ls` (confirmed `DATABASE_URL` is one value shared across Development/Preview/Production, not a separate branch as originally assumed) + `npx drizzle-kit check` ("Everything's fine") + `git log -p --all \| grep sk_live_\|pk_live_\|postgres` (clean) + `npm test && npx tsc --noEmit && npm run lint` | n/a | ✅ green — commit `e3dce0e` (unplanned Rule 2 fix: gitignored a stray Google OAuth `client_secret_*.json` file found untracked in the repo root) |
| 06-T3 | 02-06 | 4 | ACCT-01, ACCT-02, ACCT-03, MODL-01..03, D-01, D-06, D-07, D-12, D-13 | T-02-03, T-02-17, T-02-18, T-02-19 | Full nineteen-step live walkthrough at https://shaper-coral.vercel.app | manual (checkpoint:human-verify) | — | n/a | ✅ approved — surfaced two more fixes: `5c7d471` (sign-in dialog cropped Clerk's card at 384px and Clerk's own footer "Sign up" link pointed at an unreachable Account Portal subdomain; replaced with one combined `<SignIn withSignUp>` flow) and `62f61b8` (a saved board still showed the front "In progress — not saved" card, and clicking your own open board asked to replace it against itself) |
| 06-T4 | 02-06 | 4 | ACCT-01, ACCT-02, ACCT-03, MODL-01, MODL-02, MODL-03 | — | Requirements and validation record closed out to match what was actually proven | docs | `npm test && npx tsc --noEmit && npm run lint` | n/a | ✅ green (this task) |

*Status: ✅ green · ❌ red · ⚠️ flaky*

All 20 executed tasks have either a passing automated check or an approved manual checkpoint. No task lacks verification, and no three consecutive tasks lacked an automated check (checkpoint tasks are bracketed by automated ones on both sides in every plan).

---

## Wave 0 Requirements

- [x] Snapshot round-trip coverage — landed as **`lib/models/design-snapshot.test.ts`** (the seed guessed `lib/models/serialization.test.ts`; the real module is `lib/models/design-snapshot.ts`, covering `buildSnapshot`/`parseSnapshot` round-trip and rejection cases, plus `lib/geometry/design.test.ts` for the shared derivation `summarizeDesign` reads)
- [x] Ownership-scoping unit coverage for server-action helpers — landed as **`lib/db/ownership.test.ts`**, widened across 02-01 (tracer) and 02-04 (rename/duplicate/delete) to assert every exported action in `app/design/actions.ts` re-derives the caller from `auth()`, accepts no caller-supplied owner parameter, and scopes every Drizzle statement on the owning-user column — plus a source-contract check that the file exports exactly the four expected actions (`saveModel`, `renameModel`, `duplicateModel`, `deleteModel`)

Both Wave 0 dependencies are satisfied by real, passing test files — not stubs.

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | What Was Actually Observed |
|----------|-------------|------------|------------------------------|
| Sign up, log in, session persists across browser restarts | ACCT-01, ACCT-02 | Clerk-hosted flow + real browser session | Verified on the live production site (06-T3, 2026-08-27): created an account, closed and reopened the browser, nav showed the avatar (not "Sign in"). The sign-in dialog itself needed two fixes first (`5c7d471`) — a cropped card and a dead "Sign up" footer link pointing at an unreachable Clerk Account Portal subdomain — both found and fixed during this same walkthrough, not before it. |
| Password reset via emailed link | ACCT-03 | Requires real email delivery | Verified on the live production site (06-T3): triggered "Forgot password," the reset email arrived, followed the link, set a new password, signed back in with it. |
| Google sign-in on the live site | D-04 (referenced by 02-06's threat T-02-18) | Requires the production Google OAuth client and Clerk's production redirect URI, neither of which exists in development | Initially failed with Google's "Access blocked" (Clerk's production Google connection was sending an empty `client_id`); the user re-pasted the custom Google client_id/secret into Clerk, and Google sign-in was confirmed working in the same walkthrough approval. |
| Save, reopen, and list models against live Neon DB | MODL-01, MODL-02, MODL-03 | Requires provisioned Neon + Clerk env vars and a live signed-in session | Verified on the live production site (06-T3): named and saved a board, watched autosave settle "Saved" after an edit, hard-reloaded, reopened from the rack with every value intact, and confirmed rack ordering/rename/duplicate/delete. Surfaced one more bug (`62f61b8`): a saved board still showed the front "In progress — not saved" card, and clicking your own already-open board asked to replace it against itself, silently rolling back any edit newer than the last autosave. Both fixed and re-verified in the same walkthrough. |

---

## Backstop UI Considerations (from 02-UI-SPEC.md)

The UI-SPEC named four considerations as "resolved, verification: backstop" (🧪) — meaning correct behavior at design time, contingent on being exercised at execution. Recorded honestly below: **none of the four were deliberately exercised** during this phase's execution or its live walkthrough. This does not mean they are broken — only that no one has forced the specific condition and watched the actual result, so `nyquist_compliant` stays `false` until they are.

| Consideration | UI-SPEC location | What it claims | Actually exercised? |
|----------------|-------------------|------------------|----------------------|
| Throttled board-list query | Home / loading state (line 198) | A slow `listModels()` read degrades to the plain page shell (same visual as "empty"), never a spinner | **Not exercised.** Only the code path was checked (Suspense boundary present, fallback renders `SetupScreen` with an empty array) — 02-03's own summary marks this `human_judgment: true` / not verified live, and no later plan or the Task 3 walkthrough deliberately throttled the query. |
| Forced duplicate failure | Rack card / error state (line 224) | A failed Duplicate leaves the rack unchanged and surfaces a visible, retryable error — never a silent no-op | **Not exercised.** 02-04's summary explicitly marks the forced-failure check `status: unknown` / `human_judgment: true`. Task 3's walkthrough exercised the Duplicate happy path only (step 16), not a forced failure. |
| Long email address in Clerk's dialog | Sign-in dialog / long-text (line 240) | The dialog's width must not clip a long email address rendered by Clerk's own UI | **Not exercised.** No deliberately long test email was used in any plan's verification or in the Task 3 walkthrough. The sign-in dialog's width did change in this phase (`5c7d471`, `384px → 448px` to stop cropping Clerk's card), which makes this marginally less likely to clip than before, but that was a card-width fix, not a long-email test. |
| Blocked Clerk script | Nav / error state (line 289) | If Clerk fails to load entirely, the nav falls back to the signed-out "Sign in" button rather than breaking | **Not exercised as designed** (no one deliberately blocked the script to observe the fallback). A related but distinct failure did occur for real: Clerk's own `/__clerk/*` proxy traffic (including `clerk.browser.js`) was 404ing on the production `*.vercel.app` domain because `proxy.ts`'s matcher excluded `.js` paths — fixed in `444c58b`. That was a load failure and a fix, not a verification that the *designed fallback* (signed-out button) activates correctly when Clerk is unreachable. |

---

## Validation Sign-Off

- [x] All tasks have `<automated>` verify or an approved manual checkpoint
- [x] Sampling continuity: no 3 consecutive tasks without automated verify
- [x] Wave 0 covers both MISSING references, with real (not seed-guessed) file names
- [x] No watch-mode flags
- [x] Feedback latency < 90s
- [ ] `nyquist_compliant: true` — **left false on purpose.** The phase's actual behavior (sign-up, sign-in persistence, password reset, Google sign-in, save/reopen/list, rename/duplicate/delete, and the sign-out-safe design tool) was proven end to end on the live production site in the Task 3 walkthrough. What remains unexercised is narrower: the four UI-SPEC backstop considerations above (throttled query, forced duplicate failure, long email text, blocked-script fallback) were never deliberately forced and watched. None surfaced as a real defect during execution; none is known to be broken. They are simply unverified, and this record says so rather than ticking them by default.

**Approval:** phase validated 2026-08-27 against the live production site (06-T3, user response "approved"); `nyquist_compliant` remains `false` pending the four backstop items above.
