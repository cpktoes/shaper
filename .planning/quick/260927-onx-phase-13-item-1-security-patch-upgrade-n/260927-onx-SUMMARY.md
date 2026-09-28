---
phase: quick-260927-onx
plan: 01
status: complete
subsystem: dependencies
tags: [security, next.js, sharp, npm-audit, phase-13-item-1]
requires: []
provides:
  - "next and eslint-config-next pinned exactly at 16.3.6"
  - "lockfile with 0 production audit advisories"
affects:
  - "the live site's Vercel build (installs from the lockfile)"
  - "Phase 13 item 3 (production removal migration runs on the held drizzle-kit 0.31.10)"
tech-stack:
  added: []
  patterns:
    - "lockfile-only npm operations (--package-lock-only --ignore-scripts) in a worktree"
key-files:
  created: []
  modified:
    - package.json
    - package-lock.json
decisions:
  - "drizzle-kit held at 0.31.10: npm audit fix proposed 0.31.11, which clears no advisory, and the tool runs item 3's production migration next"
  - "The four remaining developer-only moderates (esbuild chain under drizzle-kit) are accepted: the only fix npm offers is a forced backwards major move of the migration tool"
metrics:
  duration: "about 2 minutes"
  completed: 2026-09-28
  tasks: 2
  files: 2
actuals:
  tokens: 9400
  tasks: 2
  commits: 2
---

# Quick 260927-onx: Phase 13 item 1 — the security patch Summary

**In plain English:** the live site runs on Next.js, the framework that serves every page. The version it
ran (16.3.1) had a critical flaw that could let a stranger run their own code on the server by sending it a
specially made picture. This patch moves the site to 16.3.6, the fixed release of the same version line,
along with the fixed copy of the picture library that comes with it, and clears four lesser warnings in a
helper tool used to add buttons and panels. Nothing about how a board is drawn, calculated, saved or printed
changes, and no saved board is touched.

One-liner: Next.js 16.3.1 → 16.3.6 (exact pins) plus `npm audit fix` for four shadcn-borne libraries, drizzle-kit
held at 0.31.10 — production audit 6 → 0, full audit 10 → 4 (developer-only esbuild chain).

## Commits

| Task | Commit | Subject |
|------|--------|---------|
| 1 | 5d2d5a1 | fix(deps): patch the site's framework for a critical security flaw (quick 260927-onx) |
| 2 | e9afc79 | fix(deps): clear the lesser security warnings in a bundled helper tool (quick 260927-onx) |

Both commits touch only `package.json` / `package-lock.json`; `git diff --stat main` lists only those two files
(package.json 4 lines = 2 changed, package-lock.json 250+/184-).

## Audit counts, before and after

Production (`npm audit --omit=dev --package-lock-only`): **6 → 0**
(before: 1 critical, 3 high, 2 moderate; after: `{"info":0,"low":0,"moderate":0,"high":0,"critical":0,"total":0}`).

Full (`npm audit --package-lock-only`, developer tools included): **10 → 4**
(before: 1 critical, 3 high, 6 moderate; after: `{"moderate":4,"high":0,"critical":0,"total":4}`).

| Advisory | Severity | Before | Fixed at | How |
|---|---|---|---|---|
| next — remote code execution via the image-resizing endpoint (AVIF); RCE on Windows-hosted servers | critical | 16.3.1 | 16.3.6 | Task 1 pin |
| sharp (libheif) — comes with next | high | 0.35.3 | 0.35.5 | pulled by next 16.3.6 |
| fast-uri — via shadcn → ajv | high | 3.1.5 | 3.1.8 | Task 2 audit fix |
| js-yaml — via shadcn → cosmiconfig (also eslint) | high | 4.3.1 | 4.3.2 | Task 2 audit fix |
| hono — via shadcn → @modelcontextprotocol/sdk | moderate | 4.13.3 | 4.13.9 | Task 2 audit fix |
| qs — via shadcn → @modelcontextprotocol/sdk → express | moderate | 6.15.3 | 6.16.0 | Task 2 audit fix |

## Every lockfile entry that moved against main (49)

**Next.js family (12), all 16.3.1 → 16.3.6:** next, eslint-config-next, @next/env, @next/eslint-plugin-next,
@next/swc-darwin-arm64, @next/swc-darwin-x64, @next/swc-linux-arm64-gnu, @next/swc-linux-arm64-musl,
@next/swc-linux-x64-gnu, @next/swc-linux-x64-musl, @next/swc-win32-arm64-msvc, @next/swc-win32-x64-msvc.

**sharp + @img/* (27):** sharp 0.35.3 → 0.35.5; @img/sharp-* platform packages 0.35.3 → 0.35.5 (darwin-arm64,
darwin-x64, freebsd-wasm32, linux-arm, linux-arm64, linux-ppc64, linux-riscv64, linux-s390x, linux-x64,
linuxmusl-arm64, linuxmusl-x64, wasm32, webcontainers-wasm32, win32-arm64, win32-ia32, win32-x64 — 16);
@img/sharp-libvips-* 1.3.2 → 1.3.4 (darwin-arm64, darwin-x64, linux-arm, linux-arm64, linux-ppc64,
linux-riscv64, linux-s390x, linux-x64, linuxmusl-arm64, linuxmusl-x64 — 10).

**The four shadcn libraries (4):** fast-uri 3.1.5 → 3.1.8, js-yaml 4.3.1 → 4.3.2, hono 4.13.3 → 4.13.9,
qs 6.15.3 → 6.16.0.

**npm's own bookkeeping (6 entries + the lockfile name), both harmless:**
- The lockfile's top-level `name` went from `shaper` to `shaper-assistant`, catching up with the name
  package.json has carried all along. It is a label only; nothing installs differently.
- Six new entries under `node_modules/@tailwindcss/oxide-wasm32-wasi/node_modules/`, each marked `inBundle`:
  @emnapi/core 1.11.1, @emnapi/runtime 1.11.1, @emnapi/wasi-threads 1.2.2, @napi-rs/wasm-runtime 1.1.4,
  @tybys/wasm-util 0.10.2, tslib 2.8.1. npm 11 now lists the contents that ship inside Tailwind's existing
  optional, developer-only WebAssembly fallback engine. That fallback is never installed on a Mac or on
  Vercel, and nothing new is downloaded for these — they are already inside the fallback's own package.

Unchanged and asserted by the pins gate: @clerk/nextjs 7.8.2, drizzle-kit 0.31.10 (range `^0.31.10` untouched),
shadcn 4.18.0, react and react-dom 19.2.8.

## The drizzle-kit hold-back

`npm audit fix --package-lock-only --ignore-scripts` moved exactly five entries: the four shadcn libraries
above and drizzle-kit 0.31.10 → 0.31.11 as collateral. `npm install drizzle-kit@0.31.10 --save-dev
--package-lock-only --ignore-scripts` then moved only drizzle-kit back, leaving package.json byte-identical.

Why: the 0.31.11 bump clears nothing — the moderate chain under drizzle-kit is flagged identically on both
versions. drizzle-kit is the tool that runs production database migrations, and item 3 runs a production
removal migration next, so it stays exactly where it has been proven.

## The four remaining moderates (developer-only), and why they stay

`@esbuild-kit/core-utils`, `@esbuild-kit/esm-loader`, `drizzle-kit`, `esbuild` — one chain:
drizzle-kit → @esbuild-kit/esm-loader → @esbuild-kit/core-utils → esbuild 0.18.20, carrying esbuild's own
development-server request advisory (esbuild ≤ 0.24.2). They stay because:
- drizzle-kit uses esbuild only to read the database schema file; it never starts esbuild's development
  server, which is what the advisory is about;
- it is a developer tool that never ships to the live site (`npm audit --omit=dev` doesn't list it);
- npm's only offered fix is `npm audit fix --force` to drizzle-kit 0.18.1, a backwards major-version move
  this item forbids. Revisit when drizzle-kit ships a release that drops @esbuild-kit (threat T-q-onx-05, accepted).

## Gate outputs (worktree)

```
package.json: exactly two lines changed
pins ok
49 entries moved
scope ok
production audit {"info":0,"low":0,"moderate":0,"high":0,"critical":0,"total":0}
full audit {"info":0,"low":0,"moderate":4,"high":0,"critical":0,"total":4} @esbuild-kit/core-utils,@esbuild-kit/esm-loader,drizzle-kit,esbuild
```

No `node_modules` folder existed in the worktree before or after (`test ! -d node_modules` passed at every gate).

## Deviations from Plan

**1. [Rule 3 - Blocking] Scope gate read main's lockfile from a saved copy instead of an embedded `git show`**
- **Found during:** Task 2 verify
- **Issue:** the worktree sandbox refuses a Bash command whose `node -e` script calls `git show` through
  `child_process` ("names git in a form too complex to verify").
- **Fix:** ran plain `git show main:package-lock.json > <scratchpad>/lock-main.json` first, then the plan's scope
  gate verbatim except that `a` is read from that file. Same bytes, same logic, same output (49 moved, scope ok).
- **Files modified:** none. **Commit:** n/a.

Otherwise none — plan executed as written.

## Differences from the plan-time measurements

None. Every version matched (next/eslint-config-next 16.3.6, sharp 0.35.5, libvips 1.3.4, fast-uri 3.1.8,
js-yaml 4.3.2, hono 4.13.9, qs 6.16.0, drizzle-kit collateral 0.31.11 held back to 0.31.10), the moved-entry
count was 49, and the audits were 6 → 0 and 10 → 4 exactly. npm 11.17.0, Node 24.19.0.

## Handed to the orchestrator — NOT run in the worktree

The worktree has no node_modules and Turbopack cannot resolve `next` from a worktree in this repo. After merge,
on the main checkout, in order:
1. `npm ci` — not run here
2. `npm test` (unit suites, 3,043 at the Phase 13 review) — not run here
3. `npm run lint` (0 errors; warning count expected to stay 11 — a changed count from eslint-config-next 16.3.6
   is worth naming to the founder, not fixing) — not run here
4. `npm run build` — not run here
5. `npm audit --omit=dev` (0 advisories, the SPEC's "Done when") — lockfile-only equivalent run here: 0
6. `npm run test:e2e` (iPhone, Android, desktop) — not run here
7. `npm run test:e2e:prod` — not run here
8. Deploy on the founder's go; confirm the live site serves the new build; tick item 1 in the 13-SPEC Progress
   Log and the ROADMAP Phase 13 checklist — not done here

## Known Stubs

None.

## Self-Check: PASSED

- FOUND: package.json (next 16.3.6, eslint-config-next 16.3.6)
- FOUND: package-lock.json (next-16.3.6.tgz)
- FOUND: commit 5d2d5a1
- FOUND: commit e9afc79
