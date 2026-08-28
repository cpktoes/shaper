---
phase: 260827-rkw
plan: 01
subsystem: database
tags: [drizzle, drizzle-kit, neon, npm-scripts, env-vars]

requires: []
provides:
  - Branch-aware drizzle.config.ts that reads MIGRATE_ENV_FILE (default .env.local) and clears any stale shell-exported DATABASE_URL/DATABASE_URL_UNPOOLED before loading it
  - npm run db:generate / db:migrate / db:migrate:prod scripts
  - CLAUDE.md Database section documenting the production/development Neon branch split and the deploy-code-first migration rule
affects: [database, deployment, docs]

actuals:
  tokens: 1900
  tasks: 2
  commits: 2

tech-stack:
  added: []
  patterns:
    - "drizzle.config.ts resolves its env file from MIGRATE_ENV_FILE (falls back to .env.local), deletes any pre-existing DATABASE_URL/DATABASE_URL_UNPOOLED before process.loadEnvFile so a stale shell export can never outrank the named file, and prefers the unpooled/direct connection for schema changes"

key-files:
  created: []
  modified:
    - drizzle.config.ts
    - package.json
    - CLAUDE.md

key-decisions:
  - "db:migrate:prod is a single POSIX-sh script line using trap ... EXIT INT TERM around a vercel env pull + drizzle-kit migrate, guaranteeing the pulled production credential file (.env.production.pull) is deleted on every exit path, not just success"
  - "dbCredentials.url prefers DATABASE_URL_UNPOOLED over DATABASE_URL, since Neon recommends the direct connection for schema migrations"

patterns-established:
  - "Any future drizzle-kit script that needs to target a specific Neon branch sets MIGRATE_ENV_FILE rather than duplicating env-loading logic"

requirements-completed: [QUICK-260827-rkw]

coverage:
  - id: D1
    description: "npm run db:migrate targets the development Neon branch; npm run db:migrate:prod targets production via a transient pulled-credential file that is always cleaned up"
    requirement: "QUICK-260827-rkw"
    verification:
      - kind: unit
        ref: "node -e env-resolution probe (drizzle.config.ts resolves DATABASE_URL_UNPOOLED from MIGRATE_ENV_FILE, ignoring a shell-exported DATABASE_URL) -> PASS unpooled-from-named-file"
        status: pass
      - kind: unit
        ref: "node -e script probe (package.json db:generate/db:migrate/db:migrate:prod scripts exist and db:migrate:prod contains trap/rm -f/EXIT INT TERM/--environment=production/MIGRATE_ENV_FILE=.env.production.pull/drizzle-kit migrate, valid under sh -n) -> SCRIPT_OK / SH_SYNTAX_OK"
        status: pass
    human_judgment: false
  - id: D2
    description: "CLAUDE.md documents the two Neon branches, the deploy-code-first migration rule, and no longer describes Clerk/Neon as uninstalled or board state as lost on reload"
    requirement: "QUICK-260827-rkw"
    verification:
      - kind: other
        ref: "grep checks: '^## Database' section present, db:migrate:prod/db:generate documented, 'Reset from parent' mentioned -> DOCS_SECTIONS_OK; 'resets on reload' and 'not installed yet' both absent -> STALE_CLAIMS_CLEARED"
        status: pass
    human_judgment: false

duration: 10min
completed: 2026-08-27
status: complete
---

# Quick Task 260827-rkw: Split Dev Database From Production Neon Summary

**Migrations now name which Neon branch they hit, and a stale shell-exported DATABASE_URL can no longer silently redirect one to the wrong database.**

## Performance

- **Duration:** ~10 min
- **Completed:** 2026-08-27
- **Tasks:** 2/2
- **Files modified:** 3

## Accomplishments
- `drizzle.config.ts` now resolves its env file from `MIGRATE_ENV_FILE` (falling back to `.env.local`), deletes any pre-existing `DATABASE_URL`/`DATABASE_URL_UNPOOLED` from the shell before loading that file, and prefers the unpooled/direct Neon connection for schema work.
- Added `npm run db:generate`, `npm run db:migrate` (always hits the development branch), and `npm run db:migrate:prod` (pulls Production into a transient `.env.production.pull` file, migrates, and removes the file on every exit path via a `trap ... EXIT INT TERM`).
- CLAUDE.md gained a `## Database` section explaining the two Neon branches, how `.env.local` is refreshed, Neon's "Reset from parent" reset path, and the push-code-before-migrating-production rule — and had its stale "Clerk/Neon not installed yet" and "board state resets on reload" claims corrected to reflect Phase 2 shipping.

## Task Commits

Each task was committed atomically:

1. **Task 1: Route migrations at a named database branch, end to end** - `36b74d6` (feat)
2. **Task 2: Tell the reader which database their commands touch** - `bfb6d6c` (docs)

## Files Created/Modified
- `drizzle.config.ts` - Reads `MIGRATE_ENV_FILE` (default `.env.local`), clears stale shell env vars before loading it, prefers the unpooled connection URL
- `package.json` - Added `db:generate`, `db:migrate`, `db:migrate:prod` scripts
- `CLAUDE.md` - New `## Database` section; corrected stale Stack paragraph and opening summary

## Decisions Made
- `db:migrate:prod` written as a single POSIX-sh line (not bash) since npm executes script strings with `sh`; the `trap` guarantees credential cleanup on success, failed pull, failed migration, and Ctrl-C alike.
- `dbCredentials.url` prefers `DATABASE_URL_UNPOOLED` over `DATABASE_URL`, per Neon's recommendation to use the direct connection for schema migrations.

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered

None. First `git commit -m "$(cat <<'EOF' ... EOF)"` heredoc invocation for Task 2's message hit a shell quoting error inside the sandboxed Bash tool (`unexpected EOF while looking for matching '`) with no changes committed; resolved by writing the message to a temp file and using `git commit -F`. No code or scope impact.

## User Setup Required

None - no external service configuration required. `npm run db:migrate:prod` is a command a human runs later; nothing was executed, pulled, or migrated during this task, and no `.env*` file was created, edited, or deleted.

## Next Phase Readiness

`npm run db:migrate` and `npm run db:migrate:prod` are ready to use. The first real production migration should be run by a human following the CLAUDE.md Database section's deploy-code-first rule. No blockers.

## Self-Check: PASSED

- FOUND: drizzle.config.ts, package.json, CLAUDE.md
- FOUND: 36b74d6, bfb6d6c

---
*Quick task: 260827-rkw*
*Completed: 2026-08-27*
