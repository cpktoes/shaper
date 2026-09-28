---
phase: quick-260927-onx
plan: 01
type: execute
wave: 1
depends_on: []
files_modified:
  - package.json
  - package-lock.json
autonomous: true
requirements: [QT-260927-onx, 13-SPEC-item-1]

estimate:
  # Lockfile-only npm commands (no install, no build, no tests in the worktree), two JSON diffs, three audits,
  # two commits and a SUMMARY. Every command and gate below was dry-run at plan time on a copy of the two files.
  tokens: 30000
  raw_tokens: 30000
  tasks: 2
  confidence: low

must_haves:
  truths:
    - "package.json pins `next` and `eslint-config-next` at exactly `16.3.6` (no caret), and those two lines are the ONLY lines of package.json that differ from main."
    - "`npm audit --omit=dev --package-lock-only` against the new lockfile reports 0 advisories of any severity: the critical Next.js flaws (remote code execution through the image-resizing endpoint with AVIF files, and on Windows-hosted servers), the high sharp/libheif flaw, and the fast-uri, js-yaml, hono and qs advisories are all gone."
    - "A full `npm audit --package-lock-only` (developer tools included) reports 0 critical and 0 high, and exactly four moderates — `@esbuild-kit/core-utils`, `@esbuild-kit/esm-loader`, `drizzle-kit`, `esbuild` — one developer-only chain under the database migration tool, each named in the SUMMARY with why it stays."
    - "Every lockfile entry that moved against main is in the allowed set (next, eslint-config-next, @next/*, sharp, @img/*, fast-uri, js-yaml, hono, qs, plus npm's own bookkeeping for the six bundled entries under @tailwindcss/oxide-wasm32-wasi); `@clerk/nextjs` stays 7.8.2, `drizzle-kit` stays 0.31.10, `shadcn` stays 4.18.0, React stays 19.2.8."
    - "No source file, config file or planning record changes besides the SUMMARY, and the worktree never gets a node_modules folder (lockfile-only npm operations throughout)."
  artifacts:
    - path: package.json
      provides: "The two exact pins moved from 16.3.1 to 16.3.6; every other range byte-identical to main"
      contains: "\"next\": \"16.3.6\""
    - path: package-lock.json
      provides: "The resolved tree Vercel installs from: next 16.3.6 and its @next/* family, sharp 0.35.5 and its @img/* binaries, fast-uri 3.1.8, js-yaml 4.3.2, hono 4.13.9, qs 6.16.0 (versions as measured at plan time; a later patch of the same package is acceptable)"
      contains: "next-16.3.6.tgz"
  key_links:
    - from: package.json
      to: package-lock.json
      via: "The lockfile's root entry (packages[\"\"]) must mirror the two new pins, or `npm ci` on Vercel and in the main checkout refuses the install as out of sync. `npm install … --package-lock-only` writes both together; never hand-edit either."
      pattern: "\"next\": \"16.3.6\""
    - from: package-lock.json
      to: "the live site (Vercel build)"
      via: "Vercel installs from the lockfile, so the lockfile — not package.json — decides which Next.js and which sharp the live site actually runs. The audits below read the lockfile for exactly that reason."
      pattern: "node_modules/next"
---

<objective>
**Phase 13 item 1 — the security patch** (`.planning/phases/13-ready-for-the-shapers/13-SPEC.md`, item 1).

**What it does for the site, in plain English.** The live site runs on Next.js, the framework that serves
every page. The version it runs (16.3.1) has a critical flaw: someone could send a specially made image
to the framework's built-in picture-resizing address and run their own code on the server (a second
critical flaw only bites servers hosted on Windows). The fix is the patched release of the same version
line, 16.3.6, which also brings a patched copy of the image library that comes with it (sharp). Four
lesser warnings arrive through a helper tool the project uses to add buttons and panels (shadcn), and
`npm audit fix` clears those. Nothing about how a board is drawn, calculated, saved or printed changes,
and no other package is upgraded — no Clerk, no major versions. This is the smallest change that clears
the advisories.

**Measured at plan time (2026-09-27, npm 11.17.0, Node 24.19.0, on copies of main's two files):**

| Advisory (via `npm audit --omit=dev`) | Severity | Today | After |
|---|---|---|---|
| next (RCE via Image Optimization + AVIF; RCE on Windows hosts) | critical | 16.3.1 | 16.3.6 |
| sharp (libheif) — comes with next | high | 0.35.3 | 0.35.5 |
| fast-uri — via shadcn → ajv | high | 3.1.5 | 3.1.8 |
| js-yaml — via shadcn → cosmiconfig (also eslint) | high | 4.3.1 | 4.3.2 |
| hono — via shadcn → @modelcontextprotocol/sdk | moderate | 4.13.3 | 4.13.9 |
| qs — via shadcn → @modelcontextprotocol/sdk → express | moderate | 6.15.3 | 6.16.0 |

Production audit: 6 advisories before (1 critical, 3 high, 2 moderate) → 0 after. Full audit including
developer tools: 10 before → 4 after, the four being one moderate, developer-only chain under the database
migration tool (see Task 2).

Purpose: clear a critical, publicly known flaw on the live site before a room of shapers sees it on Oct 10.
Output: package.json and package-lock.json changed, two commits, and the SUMMARY. The full test gates and
the deploy happen after merge, on the main checkout, by the orchestrator (see `<verification>`).
</objective>

<execution_context>
@$HOME/.claude/gsd-core/workflows/execute-plan.md
@$HOME/.claude/gsd-core/templates/summary.md
</execution_context>

<context>
@.planning/STATE.md
@.planning/phases/13-ready-for-the-shapers/13-SPEC.md
@package.json

**Where you are running.** An isolated git worktree off `main`, with NO node_modules. In this repo
Turbopack cannot resolve `next` from a worktree, so the build, the unit tests and the browser tests cannot
run here — they run on the main checkout after merge. Everything you do here is a lockfile-only npm
operation: npm reads the registry and rewrites package.json / package-lock.json without installing anything.
The base for every comparison is the `main` ref (worktrees share refs; package-lock.json on main has not
changed since Phase 9, so `git show main:package-lock.json` is a stable "before").

**Hard limits for this whole plan:**
- Change only `package.json` and `package-lock.json` (plus your SUMMARY).
- Every npm command carries `--package-lock-only` and `--ignore-scripts`. Never a bare `npm install`,
  `npm ci`, `npm update`, `npm audit fix --force`, or deleting and regenerating the lockfile (that would
  re-resolve every package in the tree, which is exactly the "upgrade everything" this item forbids).
- Do not run `npm run build`, `npm test`, `npm run lint`, or Playwright here.
- Do not edit 13-SPEC.md, ROADMAP.md or STATE.md — ticking item 1 happens after the founder's go and the
  deploy, in the commit that records it (orchestrator work, per the SPEC's "How this phase runs").
- npm prints `allow-scripts` warnings about esbuild, core-js, fsevents and unrs-resolver. They are about
  packages this plan does not touch, exist today on main, and are noise here — ignore them.
</context>

<tasks>

<task type="auto">
  <!-- Orchestrator: was type="tracer"; set to auto because in this repo a tracer task makes the executor stop for a
       human-verify checkpoint (auto_advance is false), and a lockfile-only change has nothing to show in a browser.
       The verify gates below are unchanged. -->
  <name>Task 1: Next.js 16.3.1 → 16.3.6, end to end from package.json through the lockfile to the audit</name>
  <files>package.json, package-lock.json</files>
  <action>
Per 13-SPEC item 1, the one thin path: move the framework pin, let npm carry it into the lockfile, and
prove with the audit that the critical and the sharp advisories are gone.

1. From the worktree root, first confirm `test ! -d node_modules` (it must stay absent all plan long). The
   gate is there to catch an accidental real install. If a node_modules link already exists before you run
   anything (a worktree setup step made it), leave it alone, say so in the SUMMARY, and drop just that clause
   from the verify commands.
2. Run `npm install next@16.3.6 eslint-config-next@16.3.6 --save-exact --package-lock-only --ignore-scripts`.
   `--save-exact` keeps both pins exact, as they are today (no caret). This one command writes both files.
3. What should have moved (measured at plan time; the scope gate in Task 2 checks the final set):
   next, eslint-config-next, @next/env, @next/eslint-plugin-next and the eight optional @next/swc-*
   platform binaries, all 16.3.1 → 16.3.6; sharp 0.35.3 → 0.35.5 and its 26 optional @img/* platform
   packages (sharp-* 0.35.3 → 0.35.5, sharp-libvips-* 1.3.2 → 1.3.4). Plus two pieces of npm's own
   bookkeeping, both harmless and both to be recorded in the SUMMARY: the lockfile's top-level name goes
   from "shaper" to "shaper-assistant" (catching up with the name package.json has carried all along), and
   six entries appear under `node_modules/@tailwindcss/oxide-wasm32-wasi/node_modules/` (@emnapi/core,
   @emnapi/runtime, @emnapi/wasi-threads, @napi-rs/wasm-runtime, @tybys/wasm-util, tslib), each marked
   `inBundle` — npm 11 now lists the contents that ship inside an existing optional, developer-only
   WebAssembly fallback of Tailwind's engine, which is never installed on a Mac or on Vercel. Nothing new
   is downloaded for them.
4. Run the verify commands below. If the package.json gate shows anything other than two changed lines,
   stop and report rather than hand-edit.
5. Commit package.json and package-lock.json. Subject:
   `fix(deps): patch the site's framework for a critical security flaw (quick 260927-onx)`.
   Body, in plain English a shaper could read (CLAUDE.md): the live site runs on Next.js, the framework that
   serves every page; version 16.3.1 had a critical flaw that let someone who sent a specially made image to
   its built-in picture-resizing address run their own code on the server; this moves to 16.3.6, the patched
   release of the same line, along with the patched image library that comes with it; nothing about how
   boards are drawn, calculated, saved or printed changes. End with the trailer line
   `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>`.
  </action>
  <verify>
    <automated>test ! -d node_modules && git diff --numstat main -- package.json | grep -qx "2	2	package.json" && echo "package.json: exactly two lines changed" && node -e 'const p=require("./package.json"),l=require("./package-lock.json").packages;const ok=p.dependencies.next==="16.3.6"&&p.devDependencies["eslint-config-next"]==="16.3.6"&&l[""].dependencies.next==="16.3.6"&&l[""].devDependencies["eslint-config-next"]==="16.3.6"&&l["node_modules/next"].version==="16.3.6"&&l["node_modules/eslint-config-next"].version==="16.3.6"&&l["node_modules/@clerk/nextjs"].version==="7.8.2";console.log(ok?"pins ok":"PIN MISMATCH");process.exit(ok?0:1)' && npm audit --omit=dev --package-lock-only --json 2>/dev/null | node -e 'let s="";process.stdin.on("data",d=>s+=d).on("end",()=>{const v=JSON.parse(s).vulnerabilities;const left=["next","sharp"].filter(n=>v[n]);console.log(left.length?"STILL FLAGGED: "+left.join(","):"next and sharp clear");process.exit(left.length?1:0)})'</automated>
  </verify>
  <done>
package.json differs from main by exactly the two pins (`"next": "16.3.6"`, `"eslint-config-next": "16.3.6"`,
both exact); the lockfile resolves next and eslint-config-next to 16.3.6 and sharp to 0.35.4 or later;
`@clerk/nextjs` is still 7.8.2; the production audit no longer lists next or sharp; no node_modules folder
exists; one commit with the plain-English body and the trailer.
  </done>
</task>

<task type="auto">
  <name>Task 2: Clear the four advisories that come through shadcn, hold the migration tool where it is, and prove the scope</name>
  <files>package.json, package-lock.json</files>
  <action>
Per 13-SPEC item 1 ("plus `npm audit fix` for the advisories that arrive through other packages. Nothing
else is upgraded").

1. Run `npm audit fix --package-lock-only --ignore-scripts` (never `--force`). Measured at plan time it moves
   fast-uri 3.1.5 → 3.1.8, hono 4.13.3 → 4.13.9, js-yaml 4.3.1 → 4.3.2, qs 6.15.3 → 6.16.0 — and ALSO
   drizzle-kit 0.31.10 → 0.31.11 as collateral.
2. Hold drizzle-kit back (planner's decision, recorded here for the SUMMARY): run
   `npm install drizzle-kit@0.31.10 --save-dev --package-lock-only --ignore-scripts`. Measured at plan time,
   this moves only drizzle-kit back to 0.31.10 and leaves package.json byte-identical (its range stays
   `^0.31.10`). Why: the drizzle-kit bump clears nothing — the moderate advisory chain under it
   (drizzle-kit → @esbuild-kit/esm-loader → @esbuild-kit/core-utils → an old esbuild 0.18.20, esbuild's own
   development-server request advisory) is flagged identically before and after 0.31.11, and npm's only
   offered fix is `--force` to drizzle-kit 0.18.1, a backwards major-version move this item forbids.
   drizzle-kit is the tool that runs production database migrations, and item 3 runs a production removal
   migration next, so it stays exactly where it has been proven. It is a developer tool: it never ships to
   the live site, which is why `npm audit --omit=dev` does not list it.
3. If the fix moved anything else a scope gate below flags — a direct dependency, or a package name outside
   the allowed set — do not improvise a hold-back for it (re-pinning a caret range can rewrite package.json).
   Stop and report what moved and why npm moved it. A newer patch of an allowed package than the versions
   measured above (the registry may have moved since plan time) is fine; name it in the SUMMARY.
4. Run the verify commands below: the package.json gate (still exactly two lines), the pins gate (now also
   drizzle-kit 0.31.10, shadcn 4.18.0, react and react-dom 19.2.8), the scope gate (every lockfile entry that
   differs from main is in the allowed set; it prints the count and any out-of-scope entries — measured: 49
   entries moved, scope ok), the production audit (total 0) and the full audit (0 critical, 0 high, and
   exactly the four esbuild-chain moderates).
5. Commit package-lock.json (and package.json only if npm reformatted it without changing content — the
   package.json gate must still pass). Subject:
   `fix(deps): clear the lesser security warnings in a bundled helper tool (quick 260927-onx)`.
   Body, in plain English: four lesser security warnings came in through a helper tool the project uses to
   add buttons and panels to the screens; this moves the four small libraries behind them to their patched
   releases; the database tool that saves boards to the server is deliberately left exactly where it was;
   nothing a shaper sees or does on the site changes. End with the trailer line
   `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>`.
6. Write the SUMMARY (see `<output>`). If your Write tool refuses the path, write it inside your worktree and
   copy it into place with Bash.
  </action>
  <verify>
    <automated>test ! -d node_modules && git diff --numstat main -- package.json | grep -qx "2	2	package.json" && echo "package.json: exactly two lines changed" && node -e 'const p=require("./package.json"),l=require("./package-lock.json").packages;const ok=p.dependencies.next==="16.3.6"&&p.devDependencies["eslint-config-next"]==="16.3.6"&&l["node_modules/next"].version==="16.3.6"&&l["node_modules/eslint-config-next"].version==="16.3.6"&&l["node_modules/drizzle-kit"].version==="0.31.10"&&l["node_modules/@clerk/nextjs"].version==="7.8.2"&&l["node_modules/shadcn"].version==="4.18.0"&&l["node_modules/react"].version==="19.2.8"&&l["node_modules/react-dom"].version==="19.2.8";console.log(ok?"pins ok":"PIN MISMATCH");process.exit(ok?0:1)' && node -e 'const cp=require("child_process");const a=JSON.parse(cp.execSync("git show main:package-lock.json",{maxBuffer:1e8})).packages;const b=require("./package-lock.json").packages;const ok=/^node_modules\/(next|eslint-config-next|sharp|fast-uri|js-yaml|hono|qs|@next\/[^/]+|@img\/[^/]+)$/;const bad=[];const moved=[];for(const k of new Set([...Object.keys(a),...Object.keys(b)])){if(k===""||JSON.stringify(a[k])===JSON.stringify(b[k]))continue;moved.push(k);const bundled=!a[k]&&b[k]&&b[k].inBundle&&k.startsWith("node_modules/@tailwindcss/oxide-wasm32-wasi/node_modules/");if(!ok.test(k)&&!bundled)bad.push(k+" "+(a[k]&&a[k].version)+" -> "+(b[k]&&b[k].version))}console.log(moved.length+" entries moved");console.log(bad.length?"OUT OF SCOPE:\n"+bad.join("\n"):"scope ok");process.exit(bad.length?1:0)' && npm audit --omit=dev --package-lock-only --json 2>/dev/null | node -e 'let s="";process.stdin.on("data",d=>s+=d).on("end",()=>{const m=JSON.parse(s).metadata.vulnerabilities;console.log("production audit",JSON.stringify(m));process.exit(m.total===0?0:1)})' && npm audit --package-lock-only --json 2>/dev/null | node -e 'let s="";process.stdin.on("data",d=>s+=d).on("end",()=>{const j=JSON.parse(s),m=j.metadata.vulnerabilities,names=Object.keys(j.vulnerabilities).sort().join(",");console.log("full audit",JSON.stringify(m),names);process.exit(m.critical===0&&m.high===0&&names==="@esbuild-kit/core-utils,@esbuild-kit/esm-loader,drizzle-kit,esbuild"?0:1)})'</automated>
  </verify>
  <done>
The production audit reports 0 advisories; the full audit reports 0 critical, 0 high and only the four
developer-only esbuild-chain moderates under drizzle-kit; drizzle-kit is back at 0.31.10 with its range
untouched; every lockfile entry that differs from main is in the allowed set; package.json still differs
from main by exactly the two pins; one commit with the plain-English body and the trailer; the SUMMARY is
written.
  </done>
</task>

</tasks>

<threat_model>
## Trust Boundaries

| Boundary | Description |
|----------|-------------|
| internet → Next.js server on Vercel | Anyone can send requests to the framework's built-in endpoints, including its image-resizing address, whether or not the app's own pages use it (the app has no `next/image` use, but the endpoint ships with the framework — patch, don't argue reachability) |
| npm registry → package-lock.json | New tarball versions enter the tree; the lockfile's integrity hashes are what Vercel and `npm ci` verify against |
| developer machine → drizzle-kit / shadcn CLI | Developer-only tools run locally with the project's database credentials (drizzle-kit) or write project files (shadcn); not shipped to the site |

## STRIDE Threat Register

| Threat ID | Category | Component | Severity | Disposition | Mitigation Plan |
|-----------|----------|-----------|----------|-------------|-----------------|
| T-q-onx-01 | Elevation of privilege | next 16.3.1 Image Optimization API (AVIF) — unauthenticated remote code execution | critical | mitigate | Task 1 moves next to 16.3.6 (exact pin); gate: production audit no longer lists `next` |
| T-q-onx-02 | Elevation of privilege | next 16.3.1 on Windows-hosted servers — unauthenticated RCE | critical (not reachable: Vercel hosts on Linux) | mitigate | Same bump as T-q-onx-01 |
| T-q-onx-03 | Tampering / Denial of service | sharp < 0.35.4 (libheif image decoding) | high | mitigate | Pulled to 0.35.5 by next 16.3.6 in Task 1; gate: production audit no longer lists `sharp` |
| T-q-onx-04 | Denial of service / Spoofing | fast-uri, js-yaml, hono, qs via shadcn (CLI and its MCP server deps) | high / moderate | mitigate | Task 2 `npm audit fix` (no `--force`); gate: production audit total 0 |
| T-q-onx-05 | Information disclosure | esbuild ≤ 0.24.2 dev-server request advisory, via drizzle-kit → @esbuild-kit/* (developer-only) | moderate | accept | drizzle-kit uses esbuild to read the schema, never runs esbuild's dev server, and never ships to the site; the only fix npm offers is a forced backwards major move of the migration tool, which this item forbids. Named in the SUMMARY; revisit if drizzle-kit ships a release that drops @esbuild-kit |
| T-q-onx-06 | Tampering | Collateral upgrades beyond the advisories (e.g. drizzle-kit 0.31.11, a Clerk bump) changing behaviour before the Oct 10 demo | medium | mitigate | Task 2 holds drizzle-kit at 0.31.10; scope gate fails on any lockfile entry outside the allowed set; pins gate asserts Clerk 7.8.2, shadcn 4.18.0, React 19.2.8 |
| T-q-onx-SC | Tampering | npm installs (lockfile-only) of next, eslint-config-next, sharp, fast-uri, js-yaml, hono, qs | high | mitigate | Package legitimacy checked at plan time: no new package names enter the tree — every moved entry is an existing dependency moving to a newer patch/minor release. Publishers verified with `npm view`: next and eslint-config-next 16.3.6 (github.com/vercel/next.js, published by GitHub Actions OIDC), sharp 0.35.5 (github.com/lovell/sharp, GitHub Actions OIDC), fast-uri 3.1.8 (fastify, matteo.collina), js-yaml 4.3.2 (nodeca, vitaly), hono 4.13.9 (honojs, GitHub Actions OIDC), qs 6.16.0 (ljharb). All [VERIFIED], none [ASSUMED]/[SUS], so no blocking legitimacy checkpoint. Lockfile integrity hashes carry through to Vercel's install; `--ignore-scripts` throughout the worktree |
</threat_model>

<verification>
**In the worktree (the executor does these, and only these):**
- Task 1 and Task 2 `<verify>` gates, all green: no node_modules; package.json two lines; pins; scope; production
  audit 0; full audit 0 critical / 0 high / exactly the four esbuild-chain moderates.
- `git status --porcelain` shows nothing uncommitted except the SUMMARY (if your workflow commits it separately).
- `git diff --stat main` lists only package.json, package-lock.json (and the SUMMARY).

**Not in the worktree — the executor must NOT attempt these.** The worktree has no node_modules and Turbopack
cannot resolve `next` from a worktree in this repo. After merging, the orchestrator runs on the main checkout,
in this order:
1. `npm ci` (installs exactly the new lockfile; install scripts run here, not in the worktree)
2. `npm test` — the unit suites stay green (3,043 at the Phase 13 review)
3. `npm run lint` — 0 errors; the warning count should still be the 11 item 2 will clear (a changed count from
   eslint-config-next 16.3.6 is worth naming to the founder, not fixing here)
4. `npm run build`
5. `npm audit --omit=dev` — 0 advisories (the SPEC's "Done when")
6. `npm run test:e2e` — all three browser profiles (iPhone, Android, desktop)
7. `npm run test:e2e:prod` — the production-build suite
8. Deploy only on the founder's go; then confirm the live site serves the new build, and tick item 1 in the
   13-SPEC Progress Log and the ROADMAP Phase 13 checklist in the commit that records it.
</verification>

<success_criteria>
- `package.json`: `next` and `eslint-config-next` exactly `16.3.6`; nothing else in the file changed.
- `package-lock.json`: next 16.3.6 family, sharp ≥ 0.35.4 with its @img/* binaries, fast-uri, js-yaml, hono and
  qs at patched releases; drizzle-kit 0.31.10, @clerk/nextjs 7.8.2, shadcn 4.18.0, React 19.2.8 unchanged; no
  entry outside the allowed set moved.
- `npm audit --omit=dev --package-lock-only`: 0 advisories. Full audit: 0 critical, 0 high; the four remaining
  moderates are the developer-only esbuild chain under drizzle-kit, named with why.
- Two commits, each with a plain-English body and the `Co-Authored-By` trailer; no source, config or planning
  record changed besides the SUMMARY.
</success_criteria>

<output>
Create `.planning/quick/260927-onx-phase-13-item-1-security-patch-upgrade-n/260927-onx-SUMMARY.md` when done.
Open it with a short plain-English paragraph a shaper could read (what the patch does for the live site, and
that nothing about their boards changes). Then record:
- the audit counts before and after (production: 6 → 0; full: 10 → 4), with each advisory and its fix version;
- every lockfile entry that moved against main, grouped (next family, sharp + @img/*, the four shadcn libraries),
  with versions — and the two pieces of npm bookkeeping (the lockfile name catching up to "shaper-assistant";
  the six `inBundle` entries under @tailwindcss/oxide-wasm32-wasi) with why each is harmless;
- the drizzle-kit hold-back (0.31.11 proposed by `npm audit fix`, held at 0.31.10) and why;
- the four remaining developer-only moderates by name, and why they stay;
- anything that differed from the plan-time measurements (a newer patch version, a different entry count), or
  "none";
- the gates handed to the orchestrator (the numbered list in `<verification>`), marked as not run in the worktree.
</output>
