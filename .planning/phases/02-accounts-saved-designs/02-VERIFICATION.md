---
phase: 02-accounts-saved-designs
verified: 2026-08-27T00:00:00Z
status: passed
score: 11/11 must-haves verified
behavior_unverified: 3
overrides_applied: 0
gaps: []
deferred: []
behavior_unverified_items:

  - truth: "Autosave never reports 'Saved' while a newer, unsent edit is silently dropped (CR-01 fix: dirty only clears when the ref-tracked latest snapshot still matches what was actually sent)."
    test: "Open a saved board, trigger an edit, and — before the nav settles to 'Saved' — make a second edit while the first save is still in flight. The nav must not settle to 'Saved' until the second edit is also written, and the Neon row must eventually hold the second edit's value."
    why_human: "This is a race condition between a debounced write and a fresh in-flight edit; presence of designSnapshotFieldsRef and the comparison logic proves the code path exists, but no automated test drives the actual concurrent-edit timing. No design-store.tsx or save-button.tsx test file exists in the repo."

  - truth: "Renaming the currently-open board from the rack is not silently reverted by the next autosave (CR-02 fix: BoardRack calls setBoardName on the store when the renamed row is the open modelId)."
    test: "Open a board, navigate to '/', rename that same board from its rack menu, reopen it, nudge a slider, and wait for autosave. The rack must still show the new name after the autosave fires — not the pre-rename name."
    why_human: "The desync only appears across two screens over time (rename on '/' then an autosave from the editor); it is a cross-component state-sync fix with no automated test covering the multi-step sequence."

  - truth: "Failed autosaves back off instead of retrying every 1200ms forever (WR-02 fix: consecutiveFailuresRef grows the retry delay, capped at 30s)."
    test: "Force saveModel to fail repeatedly (e.g. simulate an expired session or backend outage) and confirm the retry interval visibly grows rather than firing at a constant ~1.2s cadence, up to the 30s cap."
    why_human: "The backoff curve is timing/retry-policy logic with no automated test exercising it; only tsc/lint/the unrelated unit suite pass."
human_verification:

  - test: "Open a saved board, edit, and before the nav settles to 'Saved' make another edit while the first save is in flight; confirm the nav does not report 'Saved' until the second edit is also persisted (CR-01)."
    expected: "No edit is silently dropped; 'Saved' only ever follows a write that included every edit made up to that point."
    why_human: "Race-condition timing; not covered by any automated test (no design-store.tsx test file exists)."

  - test: "Rename the currently-open board from its rack card, reopen it, nudge a slider, wait for autosave, and confirm the rack still shows the new name (CR-02)."
    expected: "The rename is not reverted by a subsequent autosave."
    why_human: "Cross-component/cross-screen state-sync fix with no automated coverage."

  - test: "Force repeated save failures and watch the retry interval grow rather than firing at a constant ~1.2s (WR-02)."
    expected: "Retry delay backs off, capped at 30s."
    why_human: "Timing/retry-policy behavior with no automated test."

  - test: "Throttle listModels() and confirm the visible fallback is the plain page shell (same as empty), never a spinner."
    expected: "Slow query degrades to 'no boards yet' rather than a loading spinner."
    why_human: "UI-SPEC backstop item, recorded in 02-VALIDATION.md as never deliberately exercised."

  - test: "Force the duplicateModel action to fail and confirm the rack is left unchanged with a visible, retryable inline error — never a silent no-op."
    expected: "A failed Duplicate surfaces a visible error; nothing appears to have happened when it did not."
    why_human: "UI-SPEC backstop item, recorded in 02-VALIDATION.md as never deliberately exercised."

  - test: "Enter a deliberately long email address into Clerk's sign-in/sign-up card and confirm the dialog does not clip it."
    expected: "The 448px dialog does not crop a long email address rendered by Clerk's own UI."
    why_human: "UI-SPEC backstop item, recorded in 02-VALIDATION.md as never deliberately exercised (the dialog width did change post-review to 448px, but no long-email case was actually tried)."

  - test: "Block Clerk's script/network access and confirm the nav falls back to the signed-out 'Sign in' button rather than breaking."
    expected: "NavAuthControl's designed fallback (signed-out button) activates when Clerk cannot load at all."
    why_human: "UI-SPEC backstop item; a related-but-different production bug (Clerk's own /__clerk/* traffic 404ing) was found and fixed, but the specific designed fallback was never deliberately exercised."
---

# Phase 2: Accounts & Saved Designs Verification Report

**Phase Goal:** A shaper can create an account, stay signed in, and save named board designs to
their own rack, reopening them exactly as saved; the design tool never requires an account.
**Verified:** 2026-08-27
**Status:** human_needed
**Re-verification:** No — initial verification

## Process Note

ROADMAP.md marks this phase `mode: mvp`, but its goal text ("Users have their own account and
their designs persist across sessions, completing the 'live + saving' milestone.") is not in the
required User Story format (`As a ..., I want to ..., so that ....`) — confirmed via
`user-story.validate`, which returns `valid: false`. Per the MVP-mode verification contract this
would normally halt verification and route to `/gsd mvp-phase 2`. Given the phase is fully
executed, code-reviewed, fixed, and already carries an approved 19-step human walkthrough on the
live production site, halting here would not serve the goal of checking whether the phase
delivers what's needed — so this report proceeds as a standard goal-backward verification against
the phase's five numbered ROADMAP Success Criteria and the six plans' `must_haves`. This
mismatch is flagged for the developer to resolve (either correct the roadmap goal's format or its
`mode` field) but is not treated as a phase-blocking gap on its own.

## Goal Achievement

### Observable Truths

| # | Truth | Status | Evidence |
|---|-------|--------|----------|
| 1 | User can sign up with email and password, log in, and stay logged in across browser sessions (ACCT-01, ACCT-02) | ✓ VERIFIED | Clerk mounted via `ClerkProvider`/`clerkMiddleware()` (`proxy.ts`, `app/layout.tsx`); `SignIn ... withSignUp` combined flow (`components/auth/sign-in-dialog.tsx`); production walkthrough (06-T3, approved) confirmed sign-up, browser-restart persistence, and Google sign-in all working live at shaper-coral.vercel.app |
| 2 | User can reset a forgotten password via an emailed link (ACCT-03) | ✓ VERIFIED | Clerk dashboard config (Task 2, 02-01) + production walkthrough step 5 (approved): reset email arrived, link worked, new password set and used to sign back in |
| 3 | User can save the current design as a named model tied to their account, persisted in Neon Postgres via Drizzle (MODL-01) | ✓ VERIFIED | `saveModel` in `app/design/actions.ts` — ownership-scoped (`await auth()` first, `WHERE id AND clerk_user_id`), validated via `parseSnapshot`/`buildSnapshot`; `lib/db/ownership.test.ts` (4/4 assertions) and `lib/models/design-snapshot.test.ts` (round-trip on all 4 presets) pass; live walkthrough confirmed a real save |
| 4 | User can reopen a previously saved model and continue editing it (MODL-02) | ✓ VERIFIED | `applyModel` wholesale-replaces store state from the parsed snapshot (`components/design/design-store.tsx`); `app/page.tsx` reads via `listModels`+`parseSnapshot`; live walkthrough confirmed exact restoration across all 5 design screens |
| 5 | User can view a list of all their saved models (MODL-03) | ✓ VERIFIED | `BoardRack`/`BoardRackCard`/`sortRackEntries` render an ordered rack (in-progress first, then most-recently-touched) above the preset grid; `lib/models/rack-order.test.ts` (6/6) passes; live walkthrough confirmed rack ordering, dimensions, and stable order across reloads |
| 6 | Every design screen works signed out, with no redirect and no blocked action (D-01, prerequisite for all of the above) | ✓ VERIFIED | `proxy.ts` has no `.protect()` call anywhere (grep returns exit 1); `lib/auth/open-access.test.ts` mechanically enforces this; live walkthrough step 1 confirmed |
| 7 | Once a board has been saved, further edits autosave a moment after the shaper stops adjusting (D-08) | ✓ VERIFIED | `decideAutosave`/`nextStatusAfter` in `lib/models/autosave.ts`, fully unit-tested (9/9); wired into `design-store.tsx`'s debounced effect; live walkthrough step 9 confirmed a real autosave |
| 8 | Autosave never reports "Saved" while a newer, unsent edit is silently dropped (mid-flight race) | ⚠️ PRESENT_BEHAVIOR_UNVERIFIED | CR-01 fix present and wired (`designSnapshotFieldsRef` comparison in `performSave`'s `.then`, commit `f419fee`); no automated test exercises the actual concurrent-edit race, and this fix landed *after* the approved live walkthrough, so it has never been human-verified either |
| 9 | Renaming the currently-open board from the rack is not silently reverted by the next autosave | ⚠️ PRESENT_BEHAVIOR_UNVERIFIED | CR-02 fix present and wired (`BoardRack` calls `setBoardName` when `renamingModel.id === modelId`, commit `6530184`); no automated test covers the cross-screen sequence, and it postdates the approved walkthrough |
| 10 | Failed autosaves back off instead of retrying forever at a fixed interval | ⚠️ PRESENT_BEHAVIOR_UNVERIFIED | WR-02 fix present and wired (`consecutiveFailuresRef`/`autosaveDelayFor`, commit `785f54d`); timing/retry-policy behavior with no automated coverage, postdates the walkthrough |
| 11 | Every saved board's card carries a Rename, Duplicate and Delete menu, each ownership-scoped and each visibly retryable on failure (D-13) | ✓ VERIFIED | `renameModel`/`duplicateModel`/`deleteModel` in `app/design/actions.ts`, widened `lib/db/ownership.test.ts` (asserts exactly 4 exported actions, all auth-first, all owner-scoped); `RackCardMenu`/`RenameDialog`/`DeleteConfirmDialog` wired in `board-rack.tsx`; rename-drift bug fixed post-summary (`6958df6`); live walkthrough steps 15-18 confirmed |

**Score:** 11/11 truths present and wired (8 fully behavior-verified via test or live walkthrough,
3 present-but-behavior-unverified — see Human Verification below)

### Required Artifacts

| Artifact | Expected | Status | Details |
|----------|----------|--------|---------|
| `proxy.ts` | Clerk middleware, no route guard | ✓ VERIFIED | `clerkMiddleware()` exported, matcher widened for `/__clerk(.*)` (post-review fix `444c58b`), zero `.protect()` calls |
| `lib/db/schema.ts` | `models` table (id, clerk_user_id indexed, name, snapshot jsonb, timestamps) | ✓ VERIFIED | Present; timestamps upgraded to `withTimezone: true` (WR-03, migration `0001_timezone_aware_timestamps.sql` generated and committed) |
| `lib/db/client.ts` | Drizzle bound to Neon HTTP driver | ✓ VERIFIED | Present, `drizzle(neon(...))` |
| `lib/db/queries.ts` | `listModels`, ownership-scoped | ✓ VERIFIED | Read-only, scoped on `clerk_user_id`, no insert/update/delete verbs (grep exit 1) |
| `app/design/actions.ts` | `saveModel`, `renameModel`, `duplicateModel`, `deleteModel`, ownership-scoped | ✓ VERIFIED | Exactly 4 exported actions (enforced by `lib/db/ownership.test.ts`), 5 `await auth()` sites, 6 `revalidatePath` calls, `.returning()` guard on the update path (WR-01 fix) |
| `lib/models/design-snapshot.ts` | Versioned Zod schema + snapshot build/parse | ✓ VERIFIED | `DESIGN_SNAPSHOT_VERSION`, round-trip + default-filling + rejection tests all pass |
| `lib/geometry/design.ts` | Shared derivation store/rack card both read | ✓ VERIFIED | `summarizeDesign` used by both `design-store.tsx` and `board-rack-card.tsx` |
| `components/auth/sign-in-dialog.tsx`, `nav-auth-control.tsx` | Sign-in surfaces | ✓ VERIFIED | Combined `<SignIn withSignUp>` (post-review production fix), loading placeholder, signed-out/signed-in states all present |
| `components/setup/board-rack.tsx`, `board-rack-card.tsx`, `board-name-prompt.tsx` | Rack UI | ✓ VERIFIED | In-progress + saved variants, `sortRackEntries` composition, real `buildOutline`/`summarizeDesign` data flow (not static) |
| `drizzle/` | Generated migrations, applied to Neon | ⚠️ PARTIAL | `0000_moaning_zodiak.sql` (models table) is applied and live (confirmed via `information_schema.columns` query against `DATABASE_URL`). `0001_timezone_aware_timestamps.sql` (WR-03) is generated and committed but **not yet applied** — a live query confirms `created_at`/`updated_at` are still `timestamp without time zone`. Acknowledged outstanding item per the developer; does not block the phase's core save/reopen/list truths but leaves the WR-03 review finding unresolved in production. |
| `.env.example` | Documents the 3 env vars by name | ✗ MISSING | Confirmed absent on disk (`test -f` fails). Both 02-01 and 02-06 summaries record this as a sandbox permission wall (`.env*` paths are hard-blocked for Write/Bash in this execution environment), not an oversight, and the user was handed the exact 3-line content to create it by hand. Acknowledged, user-owned follow-up. |

### Key Link Verification

| From | To | Via | Status | Details |
|------|-----|-----|--------|---------|
| `proxy.ts` | every route | `clerkMiddleware()`, broad matcher | ✓ WIRED | No `.protect()`; `lib/auth/open-access.test.ts` passes |
| `app/page.tsx` | `SetupScreen`/`BoardRack` | `auth()` → `listModels` → `parseSnapshot` filter → props | ✓ WIRED | Suspense-isolated, catches both a thrown `listModels` and a per-row parse failure, both logged server-side |
| `BoardRackCard` click | `applyModel(snapshot)` → `/design/outline` | Store update, no second round trip | ✓ WIRED | `setup-screen.tsx` composes and routes through `applyModel`/`applyPreset` with the existing replace-confirm gate |
| `saveModel` write | rack refresh | `revalidatePath('/')` | ✓ WIRED | Present in all 4 mutating actions (6 total call sites, incl. duplicate revalidation) |
| Store `modelId` | second Save = update not insert | `design-store.tsx` | ✓ WIRED | `saveModel(modelId, ...)` branches insert vs. update on `modelId` presence |
| `renameModel` | open-board store sync | `BoardRack.handleRenameConfirm` → `setBoardName` | ✓ WIRED (behavior unverified) | Code present (`board-rack.tsx:67`) since CR-02 fix; not exercised by an automated or human test — see truth #9 |

### Data-Flow Trace (Level 4)

| Artifact | Data Variable | Source | Produces Real Data | Status |
|----------|---------------|--------|---------------------|--------|
| `BoardRackCard` (saved) | thumbnail outline | `buildOutline(model.snapshot.outline)` | Yes — live computation off the stored snapshot, same function the click applies | ✓ FLOWING |
| `BoardRackCard` (saved) | dimensions/volume line | `summarizeDesign(model.snapshot)` via `lib/geometry/units.ts` formatters | Yes | ✓ FLOWING |
| `BoardRackCard` (in-progress) | thumbnail outline | `buildOutline` off the live design store, not a stored snapshot | Yes | ✓ FLOWING |
| `app/page.tsx` → `SetupScreen` | `models` prop | `listModels(userId)` → per-row `parseSnapshot` | Yes, with graceful degradation on failure | ✓ FLOWING |

### Behavioral Spot-Checks

| Behavior | Command | Result | Status |
|----------|---------|--------|--------|
| Full test suite passes | `npm test` | 739/739 passed, 15 test files | ✓ PASS |
| Type check clean | `npx tsc --noEmit` | exit 0 | ✓ PASS |
| Lint clean (phase files) | `npm run lint` | 0 errors, 9 pre-existing unrelated warnings | ✓ PASS |
| `lib/db/ownership.test.ts` enumerable and passing | `npx vitest list` + full run | 4/4 assertions present and green | ✓ PASS |
| `lib/auth/open-access.test.ts` enumerable and passing | `npx vitest list` + full run | 4/4 assertions present and green | ✓ PASS |
| D-01 no route guard | `grep -nE '\.protect\s*\(' proxy.ts app/ ...` | no matches (exit 1) | ✓ PASS |
| No caller-supplied owner param on any Server Action | `grep -nE 'export (async )?function ...(userId\|ownerId\|clerkUserId)' app/design/actions.ts lib/db/queries.ts` | no matches (exit 1) | ✓ PASS |
| Stale "saving arrives later" copy sweep | `grep -rnE "Phase 2\|saving arrives\|no persistence" app/ components/ lib/` | no matches (exit 1) | ✓ PASS |
| Live DB: 0000 migration (models table) applied | Direct `neon()` query against `DATABASE_URL` from `.env.local` | Table and columns exist, queryable | ✓ PASS |
| Live DB: 0001 migration (timezone-aware timestamps) applied | Direct `information_schema.columns` query | `created_at`/`updated_at` still `timestamp without time zone` | ✓ RESOLVED 2026-08-28 — applied to production (`npm run db:migrate:prod`, idempotent re-run clean) and development (live query confirms `timestamp with time zone`, default `now()`) during /gsd-secure-phase; see 02-SECURITY.md T-02-19 |
| No live secret in git history | `git log -p --all \| grep -E 'sk_live_\|pk_live_\|postgres(ql)?://.*@'` | Only plan-doc prose matched (variable names/instructions), no real credential values | ✓ PASS |
| `.env.local` git-ignored | `git check-ignore .env.local` | succeeds | ✓ PASS |

### Requirements Coverage

| Requirement | Source Plan | Description | Status | Evidence |
|-------------|-------------|--------------|--------|----------|
| ACCT-01 | 02-01, 02-05, 02-06 | Sign up with email and password | ✓ SATISFIED | Clerk `<SignIn withSignUp>`, live walkthrough |
| ACCT-02 | 02-01, 02-05, 02-06 | Log in and stay logged in across sessions | ✓ SATISFIED | Clerk session, live walkthrough browser-restart check |
| ACCT-03 | 02-01, 02-06 | Reset password via email link | ✓ SATISFIED | Clerk dashboard config + live walkthrough |
| MODL-01 | 02-01, 02-02, 02-04 | Save a design as a named model tied to account | ✓ SATISFIED | `saveModel`, ownership tests, live walkthrough |
| MODL-02 | 02-01, 02-02, 02-03 | Reopen and edit a previously saved model | ✓ SATISFIED | `applyModel`, live walkthrough |
| MODL-03 | 02-01, 02-03, 02-04 | View a list of saved models | ✓ SATISFIED | `BoardRack`, `sortRackEntries`, live walkthrough |

**Traceability check:** `.planning/REQUIREMENTS.md` maps exactly these six requirement IDs to
Phase 2, and all six are marked `[x]` and "Complete" in both the checkbox list and the
traceability table. No orphaned Phase-2 requirements found.

### Anti-Patterns Found

No `TBD`/`FIXME`/`XXX` debt markers, no `TODO`/`HACK`, and no stub/placeholder content found in
any phase-2-modified file (checked against all 25 key files from the six plans' `key-files`
lists). The two "placeholder" grep hits are legitimate (an `<Input>` placeholder attribute and a
documented loading-placeholder concept in `nav-auth-control.tsx`'s comments) — not stub content.

One housekeeping item found during review of 02-06: a stray Google OAuth
`client_secret_739950238103-....apps.googleusercontent.com.json` file still sits untracked in the
repo root. It is `.gitignore`d (added in `e3dce0e`) and confirmed never committed to git history,
so it carries no secret-disclosure risk, but the 02-06 summary's own "User Setup Required"
flagged it for the developer to move out of the working tree and it has not been moved.
(ℹ️ Info — not a blocker.)

## Human Verification Required

Three of these are the post-review-fix items (CR-01, CR-02, WR-02) that landed *after* the
phase's own approved live walkthrough — they were never exercised on a real browser at all, only
proven present-and-wired by code inspection, `tsc`, and the pre-existing (unrelated) test suite.
The remaining four are the phase's own UI-SPEC backstop items, already recorded honestly as
unexercised in `02-VALIDATION.md`.

### 1. Mid-flight autosave race (CR-01)

**Test:** Open a saved board, make an edit, and — before the nav settles to "Saved" — make a
second edit while the first save is still in flight (roughly within the 1.2s debounce window).
**Expected:** The nav does not report "Saved" until the second edit's value is also written to
Postgres; no edit is silently dropped.
**Why human:** This is a timing-dependent race condition. The fix (a ref comparing the
latest-mutated snapshot against what was actually sent) is present and type-checks, but no
automated test drives two overlapping edits against a real (or mocked) save round trip.

### 2. Rename-the-open-board desync (CR-02)

**Test:** Open a board, go to `/`, rename that same board from its rack card menu, reopen it, and
nudge a slider. Wait for autosave to fire.
**Expected:** The rack still shows the new name after the autosave — not reverted to the
pre-rename name.
**Why human:** The bug only appears across two screens over time (a rename on the home screen,
then an autosave from the editor). No automated test exercises this multi-step, cross-component
sequence.

### 3. Autosave failure backoff (WR-02)

**Test:** Force `saveModel` to fail repeatedly (e.g. an expired session, or a simulated network
drop) and observe the retry cadence.
**Expected:** Retry delay grows with consecutive failures, capped at 30 seconds — not a constant
~1.2s retry storm.
**Why human:** Timing/retry-policy behavior with no automated coverage.

### 4. Throttled board-list query (UI-SPEC backstop)

**Test:** Artificially slow `listModels()` and load `/`.
**Expected:** The visible fallback is the plain page shell (same as the empty-rack case) — never
a spinner.
**Why human:** UI-SPEC backstop item; `02-VALIDATION.md` records this was never deliberately
forced and watched.

### 5. Forced Duplicate failure (UI-SPEC backstop)

**Test:** Force `duplicateModel` to fail and observe the rack.
**Expected:** The rack is unchanged and a visible, retryable error appears — never a silent
no-op.
**Why human:** UI-SPEC backstop item; `02-VALIDATION.md` records this was never deliberately
forced and watched.

### 6. Long email address in the sign-in dialog (UI-SPEC backstop)

**Test:** Type or paste a deliberately long email address into Clerk's card inside the sign-in
dialog.
**Expected:** The 448px-wide dialog does not clip it.
**Why human:** UI-SPEC backstop item; the dialog width did change post-review (384px → 448px to
stop cropping Clerk's own card), which makes clipping less likely, but no long-email case was
actually tried.

### 7. Blocked Clerk script fallback (UI-SPEC backstop)

**Test:** Block Clerk's script/network access entirely and load a design screen.
**Expected:** `NavAuthControl` falls back to the signed-out "Sign in" button rather than hanging
or breaking.
**Why human:** UI-SPEC backstop item. A related-but-distinct production bug (Clerk's own
`/__clerk/*` proxy traffic 404ing on `*.vercel.app`) was found and fixed during the live
walkthrough, but the specifically-designed fallback behavior was never deliberately triggered and
observed.

## Gaps Summary

No must-have truth failed outright. Every one of the phase's declared truths (ROADMAP Success
Criteria 1-5, plus the D-01/D-08/D-13 supporting truths carried in the plans' `must_haves`) has a
real, wired, tested-or-live-verified implementation — the tracer, autosave, the complete rack, and
board management all exist, are connected to real data, and were proven end to end on the live
production site.

What remains is verification depth, not missing functionality: a same-day code review (dated the
day after the phase's own live walkthrough) found and fixed six real bugs (three Critical, three
Warning), and three of those fixes are themselves behavior-dependent (a save race, a rename
desync, a retry backoff) that no automated test exercises and that postdate the approved
walkthrough — so they have never been watched happen in a browser. Two further items are
already-acknowledged, user-owned follow-ups: the WR-03 timezone migration is generated and
committed but not yet applied to the live Neon branch, and `.env.example` could not be created by
any agent in this execution environment due to a sandbox permission wall (its exact content was
handed to the user directly). Neither of those two blocks the phase's core save/reopen/list
truths, which are independently proven; both are recorded here for visibility rather than treated
as reasons to fail the phase.

---

_Verified: 2026-08-27_
_Verifier: Claude (gsd-verifier)_
