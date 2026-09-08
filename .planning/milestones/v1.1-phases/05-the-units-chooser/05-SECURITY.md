---
phase: 05
slug: the-units-chooser
status: verified
# threats_open = count of OPEN threats at or above workflow.security_block_on severity (the blocking gate)
threats_open: 0
asvs_level: 1
created: 2026-09-06
audited: 2026-09-06
retroactive: true
register_authored_at_plan_time: true
---

# Phase 05 — Security

> Per-phase security contract: threat register, accepted risks, and audit trail.

Retroactive audit. Phase 5 shipped on 2026-09-05 and its milestone (v1.1) was tagged and pushed
before this file existed; the milestone audit flagged the missing security pass as debt and this
closes it. The register itself is **not** retroactive — all seven plans carried a `<threat_model>`
block written at plan time, so this audit verified existing mitigations rather than inventing a
register after the fact.

---

## What a shaper needs to know

Nothing is exposed on the live site. Six things could genuinely have hurt someone, and all six hold
in the shipped code:

- **Nobody can write a units choice onto someone else's account.** The save function asks Clerk who
  you are *before* it touches the database, and it does not accept an account name as an argument
  at all — it uses the one your sign-in gave it.
- **Nobody can read someone else's setting.** The read is filtered to your own account id, and that
  id likewise comes from your sign-in, never from anything the browser sends.
- **Switching to Metric cannot change a saved board.** This is the one that would destroy trust in
  the tool. A test reads the actual source of the design store and the saved-board file and fails
  if either can even *see* the units modules, and proves formatting never writes back over a value.
- **The database change could not have damaged an existing board.** The migration contains exactly
  one statement — create a new table — and never touches the table where boards live.
- **Local work could not reach real boards.** The two database branches are split structurally by
  which environment file each migrate script reads.

The units cookie is deliberately readable by browser JavaScript and works over plain http. That is
fine: it holds one of two public words describing how you like numbers written — no name, no
session, no board data.

---

## Trust Boundaries

| Boundary | Description | Data Crossing |
|----------|-------------|---------------|
| browser → server render | The `shaper-units` cookie is written by client JavaScript and read by `app/layout.tsx` at render time; fully attacker-controlled for that attacker's own session | One of two public words |
| browser storage → client render | `localStorage["shaper-units"]` is hand-editable and shared with any script on the origin | One of two public words |
| client → Server Action | `saveUnitsPreference` is callable by anyone with a session; its argument arrives over the wire and is untrusted | A units system string |
| Server Action → Postgres | The write reaches a per-shaper row; the owning identity must come from the session, never the payload | Account id + preference |
| Postgres → server render | The stored `units` value is read back and used to choose a formatter; it may hold anything a past bug or hand-edit left there | A units system string |
| typed field → design value | `parseMetric` turns a free-form typed string into a millimetre value a shaper will cut to | A board measurement |
| stored snapshot → rendered card line | A saved board's snapshot is shaper-supplied JSON, already validated by `parseSnapshot` | Board dimensions |
| local machine → production database | `npm run db:migrate:prod` runs a schema change against the branch holding real boards | Schema DDL |
| main branch → live site | A push to `main` deploys to production automatically | Application code |

---

## Threat Register

30 unique threats across 7 plans (36 register rows; `T-05-SC` appears once per plan and is counted
once). Severity spread: 6 high, 11 medium, 19 low. All verified against the implementation — file
and line evidence, not a summary's claim.

| Threat ID | Category | Component | Severity | Disposition | Mitigation | Status |
|-----------|----------|-----------|----------|-------------|------------|--------|
| T-05-01 | Tampering | `readUnitsCookie` / `parseUnitsPreference` | low | mitigate | Allow-list against `UNITS_SYSTEMS`; `lib/units-preference.ts:30-34, 55-71`; junk cases `lib/units-preference.test.ts:69,97` | closed |
| T-05-02 | Tampering | `localStorage` read in units provider | low | mitigate | Same allow-list inside try/catch; `components/units-provider.tsx:69-76` | closed |
| T-05-03 | Information disclosure | the units cookie itself | low | accept | Carries one of two public words; no identity, session or board data; `lib/units-preference.ts:46-48` | closed |
| T-05-04 | Denial of service | `app/layout.tsx` reading `cookies()` | low | accept | Dynamic render accepted by design (D-12); also prevents shared-cache leakage; `app/layout.tsx:56` → `lib/units-server.ts:24` | closed |
| **T-05-05** | **Elevation of privilege** | `saveUnitsPreference` | **high** | mitigate | `await auth()` at `app/actions/units.ts:31` before any DB statement; sole parameter is `system`; `clerkUserId` set from session; conflicts on PK. Mechanical: `lib/db/ownership.test.ts:64-81, 83-92, 102-107, 130` | closed |
| **T-05-06** | **Information disclosure** | `readUnitsPreference` | **high** | mitigate | `eq(userPreferences.clerkUserId, clerkId)` at `lib/db/queries.ts:59`; `clerkId` from `await auth()` in `lib/units-server.ts:23`; sole caller. Mechanical: `lib/db/ownership.test.ts:135-137` | closed |
| T-05-07 | Tampering | the `system` argument over the wire | medium | mitigate | Runtime `UNITS_SYSTEMS.includes(system)` at `app/actions/units.ts:34` — a TypeScript type is not a wire check | closed |
| T-05-08 | Tampering | a junk `units` value already in the column | low | mitigate | Column value routed through `parseUnitsPreference`; `lib/db/queries.ts:60` | closed |
| T-05-09 | Repudiation | the sign-in promotion rule | medium | mitigate | `promoteToAccount` non-null only when the account value is null; `lib/units-preference.ts:114-118`; test `:161` | closed |
| T-05-10 | Denial of service | the background write's retry loop | low | mitigate | Bounded ladder `lib/units-preference.ts:135-146`, gives up `:232-238`, newer pick clears pending retry `:251-252` | closed |
| T-05-11 | Denial of service | a failed account read at render time | medium | mitigate | try/catch degrading to the cookie value; `lib/units-server.ts:28-37` | closed |
| T-05-12 | Information disclosure | card line rendering a saved board's numbers | low | accept | `listModels(userId)` is ownership-scoped; `app/page.tsx:50` | closed |
| T-05-13 | Tampering | a corrupt snapshot reaching `summarizeDesign` | low | mitigate | `parseSnapshot(row.snapshot)` before any card; `app/page.tsx:61` | closed |
| T-05-14 | Spoofing | rendered numbers misrepresenting a preset click | medium | mitigate | `presetSummary` composes exactly what `applyPreset` writes; source-contract test reads the real `DEFAULT_DESIGN_STATE`; `lib/geometry/summary-line.test.ts:89-100` | closed |
| T-05-15 | Tampering | `parseMetric` | medium | mitigate | Strict match, returns null rather than guessing; `lib/geometry/units.ts:209-221`; null cases `units.test.ts:316-344` | closed |
| T-05-16 | Tampering | cm/mm formatter disagreement on a boundary | medium | mitigate | Identical signed epsilon nudge at `lib/geometry/units.ts:77` and `:100`; agreement table `units.test.ts:225-237` | closed |
| **T-05-17** | **Tampering** | the preference leaking into a saved board | **high** | mitigate | `lib/units-isolation.test.ts:151-160` (store blind to units modules), `:162-169` (snapshot blind, no `units` field), `:217-243` (`Object.is` no-mutation) | closed |
| T-05-18 | Denial of service | none introduced | low | accept | Pure functions only; no new input path | closed |
| T-05-19 | Tampering | a conversion or clamp lost during the slider migration | medium | mitigate | Shared row forwards the raw number and never converts; `components/design/slider-row.tsx:36,86`; `slider-row.test.ts:97,108` bans re-hand-rolled copies | closed |
| T-05-20 | Tampering | TEMPLATE sidebar disabled state / clamp warning dropped | medium | mitigate | Carried as props; `slider-row.tsx:38,71,85,42,95`; live at `components/outline/outline-controls.tsx:349,386` | closed |
| T-05-21 | Denial of service | none introduced | low | accept | Presentational refactor only | closed |
| T-05-22 | Tampering | accent fill separated from its on-accent icon colour | medium | mitigate | Paired in one class string in one module; `components/viewer/toolbar-button.tsx:59,67` | closed |
| T-05-23 | Spoofing | a one-shot action announcing itself as a toggle | medium | mitigate | Pressed attribute set only when the prop is supplied; `toolbar-button.tsx:105,108`; one-shots omit it | closed |
| T-05-24 | Tampering | a position class assembled at runtime | low | mitigate | Literal `TOOLBAR_SLOT_POSITION` record; `toolbar-button.tsx:42-47` | closed |
| T-05-25 | Denial of service | none introduced | low | accept | Presentational refactor only | closed |
| **T-05-26** | **Denial of service** | migrating production ahead of the deploy | **high** | mitigate | Push → Vercel Ready → migrate, in that order (`05-07-SUMMARY.md:98`); safe-degradation backstop at `lib/units-server.ts:31-36` means even a mis-ordered migration is cosmetic, not destructive | closed |
| **T-05-27** | **Tampering** | a migration that alters the boards table | **high** | mitigate | `drizzle/0002_tearful_vanisher.sql` — one `CREATE TABLE "user_preferences"`, zero `ALTER`; drizzle-kit generated from an additive schema change | closed |
| T-05-28 | Information disclosure | the transient pulled production env file | medium | mitigate | `db:migrate:prod` traps `EXIT INT TERM` and deletes it; no `.env*` in `git ls-files` | closed |
| **T-05-29** | **Tampering** | a local experiment reaching production data | **high** | mitigate | `drizzle.config.ts:19-25` — `MIGRATE_ENV_FILE ?? ".env.local"` splits the two Neon branches structurally; every plan before 05-07 ran against development only | closed |
| T-05-SC | Tampering | npm/pip/cargo installs | low | accept | No package manager ran in any of the 7 plans — `git log --since=2026-09-04 -- package.json package-lock.json` is empty | closed |

*Status: open · closed · open — below high threshold (non-blocking)*
*Severity: critical > high > medium > low — only open threats at or above `workflow.security_block_on` count toward `threats_open`*
*Disposition: mitigate (implementation required) · accept (documented risk) · transfer (third-party)*

---

## Accepted Risks Log

Seven `accept` dispositions. Each rationale was checked against the code rather than taken on trust.

| Risk ID | Threat Ref | Rationale | Accepted By | Date |
|---------|------------|-----------|-------------|------|
| R-05-01 | T-05-03 | The units cookie must be browser-writable (so it cannot be `HttpOnly`) and must work over plain http in local development (so it cannot be `Secure`). It carries one of two public words describing a display preference — no identity, no session, no board data. | Plan 05-01 threat model | 2026-09-04 |
| R-05-02 | T-05-04 | Reading a cookie in the root layout makes every route dynamically rendered. Accepted deliberately: decision D-12 requires the server to know the system before it renders any text, and `app/page.tsx` already rendered dynamically. Side benefit: no shared-cache leakage between shapers. | Plan 05-01 threat model | 2026-09-04 |
| R-05-03 | T-05-12 | The card line shows only a board's own dimensions, on a page that already lists only that shaper's boards through an ownership-scoped `listModels`. No new data is exposed. | Plan 05-03 threat model | 2026-09-04 |
| R-05-04 | T-05-18 | Pure functions and a test; no new input path, no network call, no unbounded work. | Plan 05-04 threat model | 2026-09-04 |
| R-05-05 | T-05-21 | Presentational refactor; no new input path, no network call, no unbounded work. | Plan 05-05 threat model | 2026-09-04 |
| R-05-06 | T-05-25 | Presentational refactor; no new input path, no network call, no unbounded work. | Plan 05-06 threat model | 2026-09-04 |
| R-05-07 | T-05-SC | No package manager runs in any plan of this phase; every import was already in `package.json`. Verified: no commit in the phase's range touches `package.json` or `package-lock.json`. | All 7 plan threat models | 2026-09-04 |

---

## Observations (non-blocking)

1. **The ownership guard matches on parameter name, not shape.** `lib/db/ownership.test.ts:90`
   flags offending signatures with `/userId|ownerId|clerkUserId/`. `readUnitsPreference(clerkId:
   string)` at `lib/db/queries.ts:56` takes an identity parameter that the regex does not match, so
   it passes on naming rather than on shape. Safe today — `queries.ts` carries no `"use server"`
   directive, so it is not reachable over the wire, and its single caller derives the id from
   `await auth()`. But a future edit that made a `queries.ts` function a Server Action would slip
   past the guard. Adding `clerkId` to that alternation is a one-word hardening.
2. **An absent `## Threat Flags` section and one reading "none" are indistinguishable.** No phase-5
   summary contains the section at all, so no executor-reported new attack surface exists to map —
   but that conclusion rests on absence, not on a positive statement.

---

## Audit Trail

## Security Audit 2026-09-06

Retroactive pass, run after the v1.1 milestone shipped, closing the gap the milestone audit
recorded as debt. Register origin: authored at plan time in all 7 PLAN.md files.

| Metric | Count |
|--------|-------|
| Threats found | 30 |
| Closed | 30 |
| Open | 0 |

Verification: full suite green (34 files, 2132 passed, 2 pre-existing skips) plus the six
security-carrying suites run on their own (151 tests). The two highest-severity mitigations
(T-05-05 and T-05-06) and the migration SQL (T-05-27) were re-read directly from source by the
orchestrator rather than accepted from the auditor's report.

Code-review fixes from `05-REVIEW.md` confirmed present in shipped code: the write-ordering queue
(`lib/units-preference.ts:194-260`), the post-hydration reconciliation flag
(`components/units-provider.tsx:116-121`), write-failure logging (`lib/units-preference.ts:237`)
and the duplicate-import fix (`lib/db/queries.ts:11`).

**Verdict: SECURED — threats_open: 0**
