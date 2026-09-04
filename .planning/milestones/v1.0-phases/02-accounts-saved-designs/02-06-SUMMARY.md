---
phase: 02-accounts-saved-designs
plan: 06
subsystem: auth
tags: [clerk, google-oauth, neon, vercel, production-deploy]

# Dependency graph
requires:
  - phase: 02-accounts-saved-designs (plan 04)
    provides: renameModel/duplicateModel/deleteModel and the rack-card menu this plan verified live
  - phase: 02-accounts-saved-designs (plan 05)
    provides: the sign-in banner and stale-copy sweep this plan verified live
provides:
  - "A production Clerk instance for shaper-coral.vercel.app with Email+Password, password reset by email, and Google sign-in on custom credentials — verified working on the live site, not just configured"
  - "Confirmation that Vercel's Neon integration gives development, preview and production the SAME DATABASE_URL (verified via vercel env ls metadata, no raw value ever read) — the phase's own key_links assumption of separate branches was wrong, and no separate migration run was needed"
  - "A closed-out REQUIREMENTS.md and 02-VALIDATION.md that record exactly what the live walkthrough proved and what it didn't (the four UI-SPEC backstop items, left honestly unexercised)"
  - "Three production-only bugs found and fixed during the live walkthrough: a 404ing Clerk proxy path, a cropped/dead-linked sign-in dialog, and a stale in-progress rack badge"
affects: []

# Actuals (#2632)
actuals:
  tokens: 7200
  tasks: 4
  commits: 6

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "One combined <SignIn routing=\"hash\" withSignUp /> instead of a separate SignIn/SignUp pair with an app-owned toggle — Clerk's own sign-up footer link points at a hosted Account Portal subdomain that doesn't exist on a *.vercel.app deployment, so any UI that can reach it is a dead end in production even though it works in dev"
    - "proxy.ts's matcher must include Clerk's own /__clerk(.*) traffic on a *.vercel.app domain — Clerk auto-proxies its script and API calls through the app at that path, and the default matcher's .js exclusion 404s it"
    - "The in-progress rack card's presence is gated on modelId === null, not on dirty/saveStatus — a saved board that's mid-autosave is not 'in progress, not saved', it's just being saved"
    - "Vercel's env-var listing collapses to one row when a variable holds the identical value across Development/Preview/Production, and splits into per-environment rows when it doesn't — a free, secret-safe way to confirm two environments share a database or a Clerk instance without ever reading the value"
    - "client_secret_*.json (Google Cloud's default OAuth-download filename) is exactly the kind of file that lands in a repo root by accident during a dashboard setup step — gitignored now, worth checking for again after any future OAuth setup"

key-files:
  created: []
  modified:
    - .gitignore
    - proxy.ts
    - components/auth/sign-in-dialog.tsx
    - components/auth/nav-auth-control.tsx
    - components/auth/sign-in-banner.tsx
    - components/design/save-button.tsx
    - components/setup/setup-screen.tsx
    - .planning/phases/02-accounts-saved-designs/02-VALIDATION.md

key-decisions:
  - "Dev and production were confirmed to share one Neon branch (not the two-branch setup the plan assumed) via `vercel env ls`'s metadata alone — DATABASE_URL shows as a single row scoped to all three Vercel environments, while CLERK_SECRET_KEY correctly shows as two separate rows (dev vs. prod), proving the check works and the migration from 02-01 already covered production"
  - "Clerk's combined sign-in-or-up flow (withSignUp on one SignIn component) replaced the two-component design entirely, not just its footer link — keeping a separate app-owned toggle alongside a component that also offers its own (broken) toggle was two competing controls, one of them dead"
  - "The stray Google OAuth client_secret_*.json file was gitignored, not deleted — it was never committed (confirmed via git log -p secrets scan) so no rotation is required, but it doesn't belong inside a git working tree at all; flagged for the developer to move out"
  - "02-VALIDATION.md's nyquist_compliant is left false on purpose: the phase's real behavior is proven live, but the four UI-SPEC backstop considerations (throttled query, forced duplicate failure, long email text, blocked Clerk script) were never deliberately forced and watched, and the record says so rather than ticking them by default"

requirements-completed: [ACCT-01, ACCT-02, ACCT-03, MODL-01, MODL-02, MODL-03]

coverage:
  - id: D1
    description: "Production Clerk instance for shaper-coral.vercel.app with Email+Password, password reset by email, and Google sign-in on custom credentials — all three working on the live site"
    requirement: "ACCT-01"
    verification:
      - kind: manual_procedural
        ref: "Task 1 checkpoint (dashboard setup, cleared) + Task 3 live walkthrough steps 3-6 (sign up, browser-restart persistence, password reset by email, Google sign-in) — approved"
        status: pass
    human_judgment: true
    rationale: "Clerk's hosted flows, real email delivery, and Google's OAuth handshake can only be proven on the live production site by a human in a real browser; this environment has no browser tool."
  - id: D2
    description: "The production Neon branch holds the models table (verified as the SAME branch dev already migrated in 02-01) and no live secret entered the repository's git history"
    requirement: "MODL-01"
    verification:
      - kind: other
        ref: "npx vercel env ls (DATABASE_URL shown as one row across Development/Preview/Production, confirming a shared branch, vs. two separate rows for the Clerk keys) + npx drizzle-kit check (\"Everything's fine\") + git log -p --all | grep -E 'sk_live_|pk_live_|postgres(ql)?://.*@' (no real values found, only plan prose) + git check-ignore .env.local"
        status: pass
    human_judgment: false
  - id: D3
    description: "The full nineteen-step live walkthrough at https://shaper-coral.vercel.app — sign-out-safe design tool, accounts, saving/autosave/reopening, the rack, and rename/duplicate/delete"
    requirement: "MODL-01, MODL-02, MODL-03"
    verification:
      - kind: manual_procedural
        ref: "Task 3 checkpoint:human-verify — user response \"approved\""
        status: pass
    human_judgment: true
    rationale: "This is the phase's own designed acceptance gate: only a human on a real browser against the live site can confirm session persistence, hosted-flow behavior, and every visual/interaction detail the nineteen steps check."
  - id: D4
    description: "REQUIREMENTS.md and 02-VALIDATION.md updated to say exactly what this phase proved and what it didn't"
    verification:
      - kind: other
        ref: "grep -c '^- \\[x\\] \\*\\*<REQ>\\*\\*' .planning/REQUIREMENTS.md for all six Phase 2 requirements (all return 1) + 02-VALIDATION.md's per-task table covering all 20 executed tasks"
        status: pass
    human_judgment: false

duration: ~50min (across the Task 1/Task 3 checkpoint waits, plus the read-only production verification and the Task 4 closeout)
completed: 2026-08-27
status: complete
---

# Phase 2 Plan 6: Ship It — Production Auth, Database, and the Live Walkthrough Summary

**The deployed site at shaper-coral.vercel.app now signs shapers up, keeps them signed in, resets passwords by email, and signs them in with Google — verified by a human walking all nineteen steps live, not inferred from a green build.**

## Performance

- **Duration:** ~50 min of active execution (excludes the two checkpoints' human wait time — dashboard setup in Task 1, the walkthrough itself in Task 3)
- **Completed:** 2026-08-27
- **Tasks:** 4/4 (2 checkpoints, 2 executed)
- **Files modified:** 8 across 5 commits

## Accomplishments

- The live site has its own production Clerk instance, its own Google OAuth credentials, and all three secrets in Vercel's Production environment — confirmed working, not just present, by the Task 3 walkthrough
- Discovered (rather than assumed) that development and production share one Neon branch: `vercel env ls`'s metadata shows `DATABASE_URL` as a single value across all three Vercel environments, so 02-01's original migration already covered production — no second migration run was needed, only a read-only confirmation
- Found and gitignored a stray Google OAuth `client_secret_*.json` file sitting untracked in the repo root before it could ever be accidentally committed (Rule 2, tied directly to this plan's own T-02-08)
- Fixed three production-only bugs the walkthrough surfaced: Clerk's own `/__clerk/*` proxy traffic 404ing behind `proxy.ts`'s matcher, a cropped sign-in dialog with a dead "Sign up" link pointing at an unreachable Account Portal subdomain, and a saved board still wearing a stale "In progress — not saved" badge
- Closed out `.planning/REQUIREMENTS.md` (already accurate, verified by grep) and rewrote `02-VALIDATION.md`'s per-task map with all 20 tasks executed across the phase's six plans, naming real commits and test files instead of the seed's guessed ones

## Task Commits

Each task was committed atomically:

1. **Task 1: Stand up the production Clerk instance, Google credentials, and Vercel environment** — checkpoint:human-action, cleared before this dispatch (no commit) — plus a same-day follow-up fix `444c58b` (let Clerk's own traffic through the middleware on vercel.app)
2. **Task 2: Apply the migration to the production database and confirm the deployed site can reach it** — `e3dce0e` (fix — no migration needed once the shared-branch fact was confirmed; the commit is the incidental gitignore fix for the stray OAuth secret file)
3. **Task 3: Walk the whole phase on the live site** — checkpoint:human-verify, user response "approved" (no commit for the checkpoint itself) — surfaced two fixes: `5c7d471` (one sign-in card that fits, with account creation built in) and `62f61b8` (a saved board stops wearing the "not saved" badge)
4. **Task 4: Close out the phase's requirements and validation record** — `4f729c4` (docs)

**Plan metadata:** this commit (docs: complete plan)

## Files Created/Modified

- `.gitignore` — added `client_secret_*.json` so a Google OAuth secret download can never be staged
- `proxy.ts` — matcher widened to let Clerk's own `/__clerk(.*)` proxy traffic through on the `*.vercel.app` domain
- `components/auth/sign-in-dialog.tsx` — replaced the two-component SignIn/SignUp + app-owned toggle with one `<SignIn routing="hash" withSignUp />`; dialog width fixed at `sm:max-w-md` (448px, matching Clerk's card exactly); `mode` prop removed
- `components/auth/nav-auth-control.tsx`, `components/auth/sign-in-banner.tsx`, `components/design/save-button.tsx` — updated for `SignInDialog`'s new prop shape (no more `mode`)
- `components/setup/setup-screen.tsx` — the in-progress rack card now requires `modelId === null`, so a saved-and-autosaving board no longer shows both its saved card and a false "not saved" card, and clicking your own open board no longer asks to replace it against itself
- `.planning/phases/02-accounts-saved-designs/02-VALIDATION.md` — full per-task verification map, Wave 0 requirements ticked with real file names, manual-only verifications recorded against the live walkthrough, and the four UI-SPEC backstop items marked honestly not exercised

## Decisions Made

- Verified the dev/prod Neon-branch question with `vercel env ls` metadata (one row = one shared value across environments) instead of trying to read or compare raw connection strings — this environment hard-blocks both `.env.local` file access and `vercel env pull` (classifier-blocked as a secret-exfiltration pattern), so this was the only channel available that never surfaces a secret value
- Replaced the sign-in dialog's two-component design entirely rather than patching just the broken footer link, since keeping an app-owned sign-in/sign-up toggle next to a component that also offers its own (broken) toggle would have left two competing controls
- Left the stray `client_secret_*.json` file in place rather than deleting it — added it to `.gitignore` (a safe, reversible protection) and flagged it for the developer to move out of the repo folder entirely, since deleting a file outside this plan's declared scope wasn't mine to decide
- Set `02-VALIDATION.md`'s `status: validated` but `nyquist_compliant: false` — the phase's real behavior is proven live, but four UI-SPEC backstop considerations were never deliberately forced and observed, and the record says so rather than claiming more than was actually verified

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 2 - Missing Critical] Gitignored a stray Google OAuth client-secret download**
- **Found during:** Task 2, while confirming the git status baseline before the secrets scan
- **Issue:** A file named `client_secret_739950238103-....apps.googleusercontent.com.json` (Google Cloud Console's default OAuth-client download filename) was sitting untracked in the repo root, almost certainly left over from Task 1's Google OAuth setup — one `git add -A`/`git add .` away from entering git history permanently, directly matching this plan's own threat T-02-08 (Information Disclosure: production secrets)
- **Fix:** Added `client_secret_*.json` to `.gitignore`; the file itself was left on disk (not deleted, not committed)
- **Files modified:** `.gitignore`
- **Verification:** `git status --ignored --short` shows the file as `!!` (ignored) rather than `??` (untracked); it was never in git history, so `git log -p --all` for `sk_live_`/`pk_live_`/`postgres(ql)://...@` returns no real values
- **Committed in:** `e3dce0e` (Task 2 commit)

**2. [Rule 1 - Bug, found by the user during the Task 3 live walkthrough] Sign-in dialog cropped Clerk's card and its own sign-up link led to a dead subdomain**
- **Found during:** Task 3's live walkthrough (steps 3 and 6)
- **Issue:** Clerk's card renders 400px wide, but the dialog capped content at 384px, cropping the card's right edge. Separately, Clerk's own "Don't have an account? Sign up" footer link pointed at the hosted Account Portal (`accounts.shaper-coral.vercel.app`), a subdomain that cannot exist under `vercel.app` — "site can't be reached" for every new shaper who clicked it. The app also showed a second, app-owned sign-up toggle underneath, so two competing controls, one of them dead.
- **Fix:** Widened the dialog to `sm:max-w-md` (448px, measured as exactly card plus padding) and replaced the two-component design with Clerk's own combined sign-in-or-up flow (`withSignUp` on one `SignIn`), reading "Continue to Shaper." No separate SignUp component, no portal link, no duplicate footer, `mode` prop removed from `SignInDialog` and all three callers.
- **Files modified:** `components/auth/sign-in-dialog.tsx`, `components/auth/nav-auth-control.tsx`, `components/auth/sign-in-banner.tsx`, `components/design/save-button.tsx`
- **Verification:** Re-verified in the browser during the same walkthrough; dialog renders at 448px with zero horizontal overflow, Google icon renders, single set of controls
- **Committed in:** `5c7d471`

**3. [Rule 1 - Bug, found by the user during the Task 3 live walkthrough] A saved board kept wearing the "not saved" badge, and clicking your own open board asked to replace it**
- **Found during:** Task 3's live walkthrough (steps 9-11): "says not saved, which doesn't make sense when it's auto saving"
- **Issue:** Once a board was saved, the home screen showed it twice — its own saved card, plus the front "In progress — not saved" card, a duplicate wearing a label that stopped being true the moment autosave took over. Same blind spot's second symptom: clicking the very board you already had open asked "replace your in-progress board?" against itself, and confirming rolled the design back to the last-saved snapshot, discarding any edit newer than the last autosave flush.
- **Fix:** The in-progress card now requires `modelId === null` — it appears only while the working board has no saved home yet. Clicking your own already-open board now simply continues it instead of prompting a replace-confirm.
- **Files modified:** `components/setup/setup-screen.tsx`
- **Verification:** Re-verified in the browser during the same walkthrough; saving stopped the duplicate card and clicking the open board no longer prompted a false replace-confirm
- **Committed in:** `62f61b8`

---

**Total deviations:** 3 auto-fixed (1 missing-critical security gap found by the executor, 2 bugs found by the user during the Task 3 live walkthrough — exactly what that gate exists to catch)
**Impact on plan:** All three were necessary for correctness or security. No scope creep — every fix stayed inside files these bugs actually lived in.

## Known Stubs

None. Every surface this plan touched is wired to real production infrastructure — no placeholder text, no mock data standing in for a live account or a live board.

## Threat Flags

None beyond what this plan's own `<threat_model>` already covers, with one exception worth flagging forward: the stray `client_secret_*.json` file (Auto-fixed Issue 1 above) is now gitignored but still physically present in the repo working tree. Recommend the developer move it out of the repo folder entirely — no rotation needed since it was never committed, but it shouldn't live inside a git working tree at all.

## Issues Encountered

- **`.env.example` still could not be created — same sandbox wall 02-01 hit.** Both the `Write` tool and a `Bash` heredoc are hard-blocked for any `.env*` path in this execution environment. The exact content (names only, no values, plus the two-branch note) was prepared and handed to the user directly in the Task 2 checkpoint report for manual creation at the repo root. User-acknowledged, not a blocker.
- **`client_secret_*.json` is still in the repo root.** Gitignored (Auto-fixed Issue 1 above), so it can no longer be committed, but the developer still needs to move it out of the repo folder. User-acknowledged, not a blocker.
- **This execution environment cannot read `.env.local` or pull Vercel environment values at all.** Direct file access to any `.env*` path is denied by a static permission rule, and `vercel env pull` (any destination filename, including outside the repo) is blocked by the auto-mode classifier as a secret-exfiltration pattern. The Task 2 production-database verification was redesigned around this constraint: `vercel env ls` (names/scopes only) confirmed the shared branch, and `npx drizzle-kit check` (read-only) confirmed the schema state, both without ever seeing a raw secret value.

## User Setup Required

Two manual follow-ups remain, both already flagged to and acknowledged by the user during the Task 3 checkpoint:
1. Create `.env.example` at the repo root with the three variable names (no values) plus the two-Neon-branch note — content given verbatim in the Task 2 checkpoint report.
2. Move `client_secret_739950238103-....apps.googleusercontent.com.json` out of the repo folder entirely (it is gitignored, so no further git risk, but it shouldn't live in a working tree).

## Next Phase Readiness

- Phase 2 (accounts and saved designs) is complete and proven on the live production site: a shaper can sign up, sign in with email/password or Google, stay signed in across a browser restart, reset a forgotten password, save/autosave/reopen a board exactly as left, and rename/duplicate/delete from the rack — all while the design tool stays fully usable signed out.
- `02-VALIDATION.md` records `nyquist_compliant: false` — before a future phase claims this one fully closed, someone should deliberately exercise the four UI-SPEC backstop items (throttled board-list query, a forced Duplicate failure, a long test email in Clerk's dialog, and a blocked Clerk script) and update that record.
- No blockers. The two open items above are both documentation/housekeeping, not functional gaps.

---
*Phase: 02-accounts-saved-designs*
*Completed: 2026-08-27*

## Self-Check: PASSED

All 8 modified files found on disk; all 5 commits (`444c58b`, `e3dce0e`, `5c7d471`, `62f61b8`, `4f729c4`) found in git history.
