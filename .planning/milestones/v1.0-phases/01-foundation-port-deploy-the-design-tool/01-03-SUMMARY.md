---
phase: 01-foundation-port-deploy-the-design-tool
plan: 03
subsystem: infra
tags: [vercel, deployment, nextjs, gitignore, ci]

requires:
  - phase: 01-01
    provides: "Preset-to-editor tracer with the full route set (/, /design/outline, /design/rails, /design/volume, /design/fins, /design/summary) live"
provides:
  - "Public production deployment at https://shaper-coral.vercel.app, auto-deploying from main on every push"
  - "Explicit .env / .env.* / !.env.example gitignore block (was a blanket .env* pattern)"
  - "README.md Deployment section documenting hosting, branch, build, env vars, Node version, and the production URL"
affects: [01-04]

actuals:
  tokens: 380
  tasks: 3
  commits: 2

tech-stack:
  added: []
  patterns:
    - "Node version pinned in the Vercel project's own dashboard setting, not in package.json — avoids touching a file plan 02 asserted was unmodified; the platform setting is the authoritative pin for this deploy."

key-files:
  created: []
  modified:
    - .gitignore
    - README.md

key-decisions:
  - "Pre-flight gate (test+lint+build) run and confirmed green before asking the human to create anything on Vercel, so the first-ever deploy of a never-build-checked repo wasn't a blind bet."
  - "Deployed commit tracking confirmed indirectly (Server: Vercel header, HTTP 200 on every route, correct preset content) rather than by pushing a throwaway commit just to test auto-deploy — per the plan's own planner_assumptions, the first real confirmation of push-triggered auto-deploy is deferred to plan 04's tuned-preset push."

patterns-established: []

requirements-completed: [SETUP-01, VIZ-01, UNIT-01]

coverage:
  - id: D1
    description: "Local production build (test+lint+build) is proven clean and main is fully pushed before any Vercel connection is attempted"
    requirement: SETUP-01
    verification:
      - kind: unit
        ref: "npm run test — 583/583 passed"
        status: pass
      - kind: other
        ref: "npm run build — all 7 routes (/, /_not-found, /design/fins, /design/outline, /design/rails, /design/summary, /design/volume) prerendered as static, 0 TypeScript/ESLint errors"
        status: pass
    human_judgment: false
  - id: D2
    description: "Vercel project created, imported from cpktoes/shaper, deployed successfully, Node.js version 20.x+, production branch main, zero environment variables"
    requirement: SETUP-01
    verification:
      - kind: manual_procedural
        ref: "Task 2 checkpoint — human created the Vercel project via browser OAuth import, confirmed Node version and production branch, returned the production URL with no reported build errors"
        status: pass
    human_judgment: true
    rationale: "Granting a third-party platform OAuth access to a GitHub account and creating a project requires an interactive browser session; this cannot be performed or independently observed by the executor."
  - id: D3
    description: "Public production URL serves the real app: / returns 200 with the preset roster, all five /design/* routes return 200, URL recorded in README.md"
    requirement: VIZ-01
    verification:
      - kind: other
        ref: "curl -fsS https://shaper-coral.vercel.app returns 200 with 'Shortboard' and 'Longboard' in the body; curl on /design/outline, /design/rails, /design/volume, /design/fins, /design/summary all return 200"
        status: pass
    human_judgment: false
  - id: D4
    description: "No secrets deployed: no .env file tracked in git, .gitignore has explicit env-file coverage, Vercel project has zero environment variables"
    requirement: UNIT-01
    verification:
      - kind: other
        ref: "git ls-files | grep -cE '^\\.env' = 0 (checked both before Task 2 and after Task 3); .gitignore updated with explicit .env / .env.* / !.env.example block; human confirmed zero Vercel env vars during import"
        status: pass
    human_judgment: false

duration: 26min
completed: 2026-08-19
status: complete
---

# Phase 1 Plan 3: Vercel Deployment Summary

**Shaper is live at https://shaper-coral.vercel.app, Git-integrated to `main` for auto-deploy on every push, with a pre-flight-gated production build and no secrets anywhere in the pipeline.**

## Performance

- **Duration:** 26 min (commit-to-commit; excludes time waiting on the Task 2 human-action checkpoint)
- **Started:** 2026-08-19T22:32:02Z
- **Completed:** 2026-08-19T22:58:30Z
- **Tasks:** 3 (pre-flight gate, human Vercel import, live-deployment verification)
- **Files modified:** 2

## Accomplishments
- Confirmed the production build is clean before ever touching Vercel: `npm run test` (583/583), `npm run lint` (0 errors), `npm run build` (all 7 routes prerendered static, `/` included) all green against the pushed `main` head
- Tightened `.gitignore`'s env-file coverage from a blanket `.env*` to an explicit `.env` / `.env.*` / `!.env.example` block, matching the plan's stated secret-hygiene intent
- Added a `## Deployment` section to `README.md` documenting hosting (Vercel), production branch (`main`), zero-config build, zero required environment variables, and the confirmed Node.js floor (20.9+)
- Human created and imported the Vercel project via browser OAuth (cannot be done from a CLI); confirmed Node.js version 20.x+, production branch `main`, and zero environment variables during import — no build errors reported
- Independently re-verified the live deployment over HTTP: `/` returns 200 with `Shortboard`/`Longboard` present in the rendered body, and all five `/design/*` routes return 200
- Recorded the real production URL, `https://shaper-coral.vercel.app`, in `README.md` in place of the placeholder — Phase 1 success criterion 5 (public URL) is met

## Task Commits

Each task was committed atomically:

1. **Task 1: Pre-flight gate — prove the production build is clean before connecting Vercel** - `b3c2979` (chore)
2. **Task 2: Create the Vercel project and import the GitHub repository** - human checkpoint, approved (no code commit — external platform action only)
3. **Task 3: Verify the live deployment and record the production URL** - `d74c872` (docs)

**Plan metadata:** committed alongside this SUMMARY.md

## Files Created/Modified
- `.gitignore` - explicit `.env` / `.env.*` / `!.env.example` block replacing the blanket `.env*` pattern
- `README.md` - new `## Deployment` section (hosting, branch, build, env vars, Node version); production URL placeholder filled in with `https://shaper-coral.vercel.app`

## Decisions Made
- Ran the full local gate (`test` + `lint` + `build`) and confirmed a green production build *before* asking the human to create anything on Vercel, per the plan — a first-ever deploy of a never-build-checked repo is exactly where a production-only TypeScript/ESLint error would have surfaced.
- Did not add `engines.node` to `package.json`; the Node version floor (20.9+, confirmed locally at 24.19.0 and on Vercel via the human's Settings check) is pinned in the Vercel project's own dashboard setting instead, per the plan's explicit instruction to avoid touching a file plan 02 asserts is unmodified.
- Did not push a throwaway commit to test push-triggered auto-deploy. Confirmed the deployment is real and Git-integrated via the `Server: Vercel` response header and correct route content instead; per the plan's own `planner_assumptions`, the first genuine confirmation of auto-deploy-on-push is deferred to plan 04's push of the tuned preset values.

## Deviations from Plan

None - plan executed exactly as written. `.gitignore` already had a blanket `.env*` ignore (broader than the plan's literal ask in one sense, narrower in intent — it did not carve out `!.env.example`), so Task 1 replaced it with the plan's exact three-line block rather than treating the pre-existing pattern as sufficient.

## Issues Encountered

None. `main` was 23 commits ahead of `origin/main` at the start of this plan (accumulated from Phase 1 plans 01 and 02, executed before this plan ran); pushed before running Task 1's `git rev-list --count origin/main..HEAD` check so the check's premise (local and remote in sync) actually held.

## User Setup Required

**Vercel account creation and project import — completed.** The human created a Vercel account/session, imported `cpktoes/shaper` via **Add New… → Project**, accepted the zero-config Next.js defaults with no environment variables, confirmed Node.js Version 20.x+ and Production Branch `main` in Settings, and returned the production URL `https://shaper-coral.vercel.app`. No further action needed — this was a one-time setup step, not a recurring one.

## Next Phase Readiness
- The app is live at `https://shaper-coral.vercel.app`, Git-integrated to auto-deploy `main` on every push, so plan 04's preset-tuning commits will be build-verified automatically and visible in production without any further manual step.
- Auto-deploy-on-push itself will get its first genuine confirmation when plan 04 pushes — worth a quick spot-check (`curl` the production URL after that push lands) rather than a separate verification task.
- No blockers for plan 04.

## Self-Check: PASSED

Both modified files (`.gitignore`, `README.md`) confirmed present on disk with the expected content;
both task-commit hashes (`b3c2979`, `d74c872`) confirmed present in `git log`; production URL
independently re-verified live via `curl` immediately before writing this summary.

---
*Phase: 01-foundation-port-deploy-the-design-tool*
*Completed: 2026-08-19*
