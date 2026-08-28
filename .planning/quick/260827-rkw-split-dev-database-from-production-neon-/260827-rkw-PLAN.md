---
phase: 260827-rkw
plan: 01
type: execute
wave: 1
depends_on: []
files_modified:
  - drizzle.config.ts
  - package.json
  - CLAUDE.md
autonomous: true
requirements: [QUICK-260827-rkw]

estimate:
  tokens: 34000
  raw_tokens: 34000
  tasks: 2
  confidence: low

must_haves:
  truths:
    - "`npm run db:migrate` sends migrations to the development branch, because drizzle.config.ts reads `.env.local` by default."
    - "`npm run db:migrate:prod` pulls the Production environment into a transient file, migrates against it, and deletes that file again — including when the migration fails."
    - "A `DATABASE_URL` left exported in the developer's shell can no longer silently override the env file drizzle was told to use."
    - "Migrations connect over the direct (unpooled) Neon connection when one is available."
    - "CLAUDE.md tells a reader which Neon branch local work hits, and that code ships before the production migration runs."
  artifacts:
    - drizzle.config.ts
    - package.json
    - CLAUDE.md
  key_links:
    - "package.json `db:migrate:prod` sets MIGRATE_ENV_FILE — drizzle.config.ts is the only reader of that variable. If either side renames it, production migrations silently retarget the development branch."
    - "The transient filename `.env.production.pull` must stay matched by the existing `.env.*` rule in .gitignore, or pulled production credentials become committable."
---

<objective>
Land the repo-side half of the dev/prod database split: migration commands that make the
target branch explicit, a drizzle config that cannot be hijacked by a stale shell variable,
and documentation that tells the next reader which database their commands touch.

Purpose: the Neon database now has two branches — `main` (the live site's real boards) and
`development` (a clone for local work). The repo currently has no migration commands at all
and a config hardwired to `.env.local`, so there is nothing that can safely reach production
and nothing that says which branch a command hits. This closes both.

Output: `npm run db:generate`, `npm run db:migrate`, `npm run db:migrate:prod`, a
branch-aware drizzle.config.ts, and a Database section in CLAUDE.md carrying the
deploy-code-first rule.

**Already done outside the repo — do NOT redo, only describe it in the docs:**
- The Neon project has two branches: `main` (production) and `development` (a copy-on-write
  clone of production, auto-delete never).
- The Vercel↔Neon integration is scoped to Production + Preview only. Vercel's Development
  environment carries hand-managed `DATABASE_URL` and `DATABASE_URL_UNPOOLED` pointing at the
  `development` branch.
- `.env.local` has already been re-pulled and verified against the development branch.

**Hard constraints on this execution — read before touching anything:**
1. NEVER create, edit, or delete any `.env*` file. This is a permission wall, not a
   preference; the environment work is already finished. The only mention of
   `.env.production.pull` you may write is as text inside a package.json script string.
2. NEVER run `drizzle-kit migrate`, `drizzle-kit push`, `vercel env pull`, or any other
   command that mutates a database or writes an env file. Nothing needs to run: the
   development branch is a clone and already contains both existing migrations.
3. Verify with `npm test`, `npm run lint`, and `npx tsc --noEmit` only. Do NOT run
   `npm run build` — Turbopack only resolves correctly from the main checkout, and the
   orchestrator runs it separately if it wants it.
4. No new dependencies are added by this plan, so there is no package-install step.
5. Never echo a resolved database URL into the terminal. The probes below deliberately print
   a sentinel classification instead of the connection string.
</objective>

<execution_context>
@$HOME/.claude/gsd-core/workflows/execute-plan.md
@$HOME/.claude/gsd-core/templates/summary.md
</execution_context>

<context>
@.planning/STATE.md
@CLAUDE.md
@drizzle.config.ts
@package.json
</context>

<tasks>

<task type="tracer">
  <name>Task 1: Route migrations at a named database branch, end to end</name>
  <files>drizzle.config.ts, package.json</files>
  <precondition>Node is 22.18 or newer (`node --version`) — the verify probe imports drizzle.config.ts directly, which relies on Node's native TypeScript type stripping. Measured 24.19.0 on this machine. `process.loadEnvFile` needs 20.6+, satisfied by the same check.</precondition>
  <action>
Wire one complete path — npm script to env file to resolved connection URL — so a migration
command states which Neon branch it targets and cannot be quietly redirected.

In `drizzle.config.ts`, make three changes and keep the file's existing explain-yourself
comment style (rewrite the top comment so it describes the new behaviour; leaving the old
wording in place would document a mechanism the file no longer has):

- Hoist the imports to the top of the file. Add `existsSync` from `node:fs` alongside the
  existing `defineConfig` import from `drizzle-kit`. The current file calls
  `process.loadEnvFile` above its import statement, which works only because ESM hoists
  imports; putting them first removes that trap for the next reader.
- Replace the hardcoded `.env.local` with a resolved constant: read
  `process.env.MIGRATE_ENV_FILE` and fall back to `.env.local` when it is unset. This one
  variable is the entire contract with the `db:migrate:prod` script below.
- Replace the bare try/catch around `process.loadEnvFile` with an `existsSync` guard, and
  inside that guard `delete process.env.DATABASE_URL` and
  `delete process.env.DATABASE_URL_UNPOOLED` **before** calling `process.loadEnvFile`.
  This delete is the safety-critical line of the whole task. `process.loadEnvFile` does not
  overwrite variables that are already present in the environment — measured on this machine,
  a shell-exported value survived a file that set the same key. Without the delete, a
  developer with a stale `DATABASE_URL` exported in their shell would have that value
  silently win over the file drizzle was explicitly told to read, which is exactly the
  wrong-database migration this split exists to prevent. Keeping the `existsSync` branch
  (rather than deleting unconditionally) preserves the behaviour the old comment described:
  when no env file is on disk, a clean shell that already exports `DATABASE_URL` — CI, or
  Vercel's own build environment — still works.
- Set `dbCredentials.url` to `process.env.DATABASE_URL_UNPOOLED ?? process.env.DATABASE_URL!`.
  Neon recommends the direct, non-pooler connection for schema changes; both variables are
  present in every environment, and the `??` keeps the config working if one ever is not.

In `package.json`, add three scripts after the existing `test:watch` entry, leaving every
current script untouched:

- `db:generate` runs `drizzle-kit generate` — writes a reviewable migration under `./drizzle`.
- `db:migrate` runs `drizzle-kit migrate` — with no override set, drizzle.config.ts reads
  `.env.local`, so this always lands on the development branch.
- `db:migrate:prod` is a single POSIX-sh line, because npm executes script strings with `sh`
  and not bash. Write it as exactly:
  `trap 'rm -f .env.production.pull' EXIT INT TERM; npx vercel env pull --yes --environment=production .env.production.pull && MIGRATE_ENV_FILE=.env.production.pull drizzle-kit migrate`

  Four details in that line each carry weight. The `trap` on `EXIT INT TERM` is what
  guarantees the pulled production credentials are removed on every exit path — success,
  failed pull, failed migration, or Ctrl-C — and it preserves the underlying exit status
  rather than masking it (measured: a failing command under this trap still surfaced its own
  status while the file was removed). The `&&` means a failed pull never runs a migration
  against whatever the shell happens to hold. The filename `.env.production.pull` is chosen
  so Next.js never auto-loads it while the existing `.env.*` rule in .gitignore still
  matches it, so a pulled production credential cannot be committed even mid-run. `npx` is
  required for `vercel` because the CLI is not a project dependency, while `drizzle-kit` is
  a devDependency and so is already on the PATH npm builds for scripts.

Do not create, pull, or delete `.env.production.pull` yourself — it is a string in a script
that a human runs later, and creating it would breach constraint 1.
  </action>
  <verify>
    <automated>npx tsc --noEmit && npm run lint && npm test</automated>
    <automated>node -e 'const fs=require("fs"),os=require("os"),p=require("path");const d=fs.mkdtempSync(p.join(os.tmpdir(),"dzp-"));const f=p.join(d,"probe-env.txt");fs.writeFileSync(f,"DATABASE_URL=postgres://POOLED\nDATABASE_URL_UNPOOLED=postgres://DIRECT\n");process.env.MIGRATE_ENV_FILE=f;process.env.DATABASE_URL="postgres://SHELLLEAK";import("./drizzle.config.ts").then(m=>{const u=m.default.dbCredentials.url;fs.rmSync(d,{recursive:true,force:true});const tag=u==="postgres://DIRECT"?"DIRECT":u==="postgres://POOLED"?"POOLED":u==="postgres://SHELLLEAK"?"SHELLLEAK":"OTHER";if(tag!=="DIRECT"){console.error("FAIL resolved-from="+tag);process.exit(1);}console.log("PASS unpooled-from-named-file");});'</automated>
    <automated>node -e 'const s=(require("./package.json").scripts||{});for(const k of ["db:generate","db:migrate","db:migrate:prod"]){if(!s[k]){console.error("MISSING SCRIPT "+k);process.exit(1);}}const p=s["db:migrate:prod"];const need=["trap","rm -f .env.production.pull","EXIT INT TERM","--environment=production","MIGRATE_ENV_FILE=.env.production.pull","drizzle-kit migrate"];const miss=need.filter(n=>!p.includes(n));if(miss.length){console.error("MISSING FROM db:migrate:prod: "+miss.join(" | "));process.exit(1);}require("fs").writeFileSync(process.env.TMPDIR+"/dzs.sh",p);console.log("SCRIPT_OK");' && sh -n "$TMPDIR/dzs.sh" && echo SH_SYNTAX_OK && rm -f "$TMPDIR/dzs.sh"</automated>
  </verify>
  <done>
`npx tsc --noEmit`, `npm run lint` and `npm test` all pass. The resolution probe prints
`PASS unpooled-from-named-file`, proving three things at once: MIGRATE_ENV_FILE is honoured,
the unpooled URL is preferred, and a shell-exported DATABASE_URL no longer leaks through.
The script probe prints `SCRIPT_OK` and `SH_SYNTAX_OK`, proving all three scripts exist and
that the prod one is valid POSIX sh carrying its own cleanup trap. No `.env*` file was
created, edited or deleted, and no database was contacted.
  </done>
  <reversibility rating="reversible">Three edits to two tracked config files; `git revert` restores the previous behaviour with no external state to unwind.</reversibility>
</task>

<task type="auto">
  <name>Task 2: Tell the reader which database their commands touch</name>
  <files>CLAUDE.md</files>
  <action>
Bring CLAUDE.md in line with what shipped, then document the two-branch layout in plain
English — this file is read by shapers and by future agents, so write it the way the rest of
the file is written: what it does to the shaper's boards, not which process connects where.

Three edits:

- The paragraph under `## Stack` currently lists Clerk and Neon/Drizzle as pending work and
  says board designs are lost when the page reloads. Phase 2 shipped both accounts and saved
  designs, so that paragraph is now false in every clause. Rewrite it to say Clerk auth and
  Neon Postgres via Drizzle are installed and in use, and that Playwright remains the one
  prescribed-but-absent tool (Phase 3). Fix the same staleness in the opening summary at the
  top of the file, which still forward-refers to saving as future Phase 2 work.
- In the `## Commands` block, add the three new scripts with short comments in the style of
  the existing entries: `npm run db:generate` writes a new migration file from the schema,
  `npm run db:migrate` applies migrations to the development branch, and
  `npm run db:migrate:prod` applies them to production. Keep the existing entries as they are.
- Add a new `## Database` section after `## Commands`. It needs to carry four things:
  (a) there are two Neon branches — production, which is what the live site and Vercel
  previews read and write, and development, which is a full copy of production that local
  work uses; (b) `.env.local`, refreshed with `npx vercel env pull .env.local`, points at the
  development branch, so local experiments and migrations cannot touch a real shaper's saved
  boards; (c) `.env.local` must never be hand-edited to hold a production URL — pull it,
  don't type it; and (d) the development branch can be refreshed back to a clean copy of
  production at any time using Neon's "Reset from parent".

  Then state the deploy rule prominently, as its own emphasised line, because it is the one
  ordering mistake that takes the live site down: when a change touches both the code and the
  shape of the database, push the code first, let Vercel finish deploying it, and only then
  run `npm run db:migrate:prod`. Explain why in one plain sentence — the deployed site has to
  already understand a column before that column arrives, otherwise the live site is reading a
  database it was not built for. Never migrate production ahead of the code.
  </action>
  <verify>
    <automated>grep -q '^## Database' CLAUDE.md && grep -q 'db:migrate:prod' CLAUDE.md && grep -q 'db:generate' CLAUDE.md && grep -qi 'Reset from parent' CLAUDE.md && echo DOCS_SECTIONS_OK</automated>
    <automated>test "$(grep -ci 'resets on reload' CLAUDE.md || true)" = "0" && test "$(grep -ci 'not installed yet' CLAUDE.md || true)" = "0" && echo STALE_CLAIMS_CLEARED</automated>
    <automated>npm run lint && npm test</automated>
  </verify>
  <done>
`DOCS_SECTIONS_OK` and `STALE_CLAIMS_CLEARED` both print. CLAUDE.md names both Neon branches,
says which one local commands hit, and carries the push-code-before-migrating rule as its own
emphasised line. Nothing in the file still describes Clerk or Neon as uninstalled or board
state as lost on reload. Lint and tests stay green.
  </done>
</task>

</tasks>

<threat_model>
## Trust Boundaries

| Boundary | Description |
|----------|-------------|
| developer shell → drizzle-kit | An exported environment variable can redirect a migration to a different database than the one named on the command line. |
| Vercel Production env → local disk | `vercel env pull` materialises live production database credentials as a plaintext file in the working tree. |
| local disk → git remote | Any file in the working tree is a commit away from being public. |
| migration → live site | A schema change reaches real shapers' saved boards before or after the code that understands it. |

## STRIDE Threat Register

| Threat ID | Category | Component | Severity | Disposition | Mitigation Plan |
|-----------|----------|-----------|----------|-------------|-----------------|
| T-RKW-01 | Information Disclosure | `db:migrate:prod` pulled credential file | high | mitigate | Transient file removed by a `trap ... EXIT INT TERM` that fires on success, failed pull, failed migration and Ctrl-C alike; filename `.env.production.pull` stays matched by the existing `.env.*` rule in .gitignore so it is uncommittable even while it exists. |
| T-RKW-02 | Tampering | drizzle.config.ts env resolution | high | mitigate | `DATABASE_URL` and `DATABASE_URL_UNPOOLED` are deleted from `process.env` before `loadEnvFile`, so the named file wins over a stale exported shell value. Measured necessary: `loadEnvFile` does not overwrite existing variables. Regression-gated by the Task 1 resolution probe. |
| T-RKW-03 | Tampering | production migration ordering | medium | mitigate | Deploy-code-first rule documented as an emphasised line in CLAUDE.md's new Database section. Process control — no code gate exists for this, which is precisely why it is written down. |
| T-RKW-04 | Information Disclosure | verification output | medium | mitigate | The resolution probe classifies the resolved URL against fake sentinels and prints the sentinel name, never the connection string; its fixture env file is written to the OS temp dir and removed in the same process. |
| T-RKW-05 | Denial of Service | development branch | low | accept | Local migrations can corrupt the development branch. Accepted: it is a copy-on-write clone with no real user data, restorable at any time via Neon's "Reset from parent", which the new docs state. |
| T-RKW-SC | Tampering | npm/pip/cargo installs | high | mitigate | Not applicable — this plan adds no dependencies. `drizzle-kit` is an existing devDependency and `vercel` is invoked through `npx` by a human, never installed by this change. No package-legitimacy checkpoint is required. |
</threat_model>

<verification>
- `npx tsc --noEmit`, `npm run lint` and `npm test` are green.
- The resolution probe prints `PASS unpooled-from-named-file`. Both this probe and the
  script probe were confirmed to FAIL against the pre-change tree, so they gate real
  behaviour rather than restating it.
- The script probe prints `SCRIPT_OK` and `SH_SYNTAX_OK`.
- `DOCS_SECTIONS_OK` and `STALE_CLAIMS_CLEARED` print.
- `git status` shows exactly three modified files — drizzle.config.ts, package.json,
  CLAUDE.md — and no `.env*` path in the diff.
</verification>

<success_criteria>
A developer can run `npm run db:migrate` knowing it reaches the development branch, and
`npm run db:migrate:prod` knowing it reaches production and leaves no credential behind.
A stale `DATABASE_URL` in their shell can no longer redirect either one. CLAUDE.md explains
the two-branch layout in the language the rest of the file uses and states the
push-code-then-migrate rule. No database was contacted and no `.env*` file was touched.
</success_criteria>

<output>
Create `.planning/quick/260827-rkw-split-dev-database-from-production-neon-/260827-rkw-SUMMARY.md` when done
</output>
