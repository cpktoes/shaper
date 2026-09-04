---
phase: 02
slug: accounts-saved-designs
status: verified
# threats_open = count of OPEN threats at or above workflow.security_block_on severity (the blocking gate)
threats_open: 0
asvs_level: 1
created: 2026-08-28
---

# Phase 02 — Security

> Per-phase security contract: threat register, accepted risks, and audit trail.
> Register authored at plan time (all six 02-0N-PLAN.md files carry `<threat_model>` blocks);
> this audit verified each mitigation exists in the implementation at ASVS L1 (grep depth),
> plus live database queries for the migration threat.

---

## Trust Boundaries

| Boundary | Description | Data Crossing |
|----------|-------------|---------------|
| browser → Server Action | Design snapshot, board name, row id arrive from a client the server does not control; autosave crosses this on a timer | Board designs, names, row ids |
| browser → Clerk | Credentials and session tokens, owned end to end by Clerk | Credentials, session tokens |
| Server Action → Neon | Every read/write of another shaper's data is reachable from here if a WHERE clause is wrong | All saved boards |
| Neon → Server Component | Row contents including jsonb snapshots that may not match what the app expects | Saved snapshots |
| Server Component → browser | Saved snapshots serialized into the page for rack thumbnails; `listModels` scoping decides whose data reaches whose browser | Per-shaper board data |
| browser storage → render decision | Save-nudge banner dismissal flag, shaper-controlled | UI preference only |
| repo → deployment / the world | Secrets move by hand between dashboards; the repo is public-shaped and permanent | Clerk keys, Neon connection strings |
| internet → live site | First deployment holding a shaper's data behind an account | All of the above |

---

## Threat Register

| Threat ID | Category | Component | Severity | Disposition | Mitigation | Status |
|-----------|----------|-----------|----------|-------------|------------|--------|
| T-02-01 | Spoofing | Session handling | high | transfer | Clerk owns password hashing, cookies, token rotation; no custom credential code in repo | closed |
| T-02-02 | Tampering | saveModel / rename / duplicate / delete input shapes | critical | mitigate | No action signature takes a user/owner param (verified in `app/design/actions.ts`); identity re-derived via `await auth()` inside each action (5 call sites); `lib/db/ownership.test.ts` | closed |
| T-02-03 | Elevation of Privilege | Update/rename/delete WHERE clauses (IDOR) | critical | mitigate | Every mutation WHERE constrains `and(eq(models.id, modelId), eq(models.clerkUserId, userId))` — verified at actions.ts:73, 103, 111, 134, 160 | closed |
| T-02-04 | Information Disclosure | `listModels` | high | mitigate | Select scoped on `eq(models.clerkUserId, clerkId)` (`lib/db/queries.ts:41`); read path has no write verbs; `ownership.test.ts` | closed |
| T-02-05 | Tampering | Snapshot jsonb payload | medium | mitigate | `parseSnapshot` (Zod) validates before every write and after every read (`actions.ts`, `page.tsx`, `lib/models/design-snapshot.ts` + tests); unparsable rows dropped, not rendered | closed |
| T-02-06 | Denial of Service | Server Action body size | low | accept | Framework 1MB default retained (snapshot is a few hundred bytes) | closed (accepted) |
| T-02-07 | Tampering | CSRF against Server Actions | medium | transfer | Next.js Origin/Host comparison on Server Action POSTs; `serverActions.allowedOrigins` unset (verified) | closed |
| T-02-08 | Information Disclosure | Secrets in git | high | mitigate | No `.env*` or `client_secret*` files tracked (git index verified); verification's git-history grep found no live key/connection-string values | closed |
| T-02-SC | Tampering | npm install of `@clerk/nextjs` | high | mitigate | Package legitimacy gate + blocking human checkpoint ran before install (02-01) | closed |
| T-02-09 | Denial of Service | Autosave write amplification | low | mitigate | Debounce is a named tested constant (≥800ms floor); `decideAutosave` returns wait while a write is in flight (`lib/models/autosave.test.ts`) | closed |
| T-02-10 | Repudiation | "Saved" reported without a write | medium | mitigate | `nextStatusAfter` cannot return saved for a rejected attempt; dirty clears only on server confirm; UAT test 1 (in-flight edit) passed live 2026-08-28 | closed |
| T-02-11 | Denial of Service | One corrupt row breaking the home screen | medium | mitigate | Per-row parse-and-drop in `page.tsx`; board-list failure degrades to the preset grid | closed |
| T-02-12 | Information Disclosure | `duplicateModel` source read | critical | mitigate | Source row read through ownership-scoped select (actions.ts:134); snapshot comes from that read, never client input | closed |
| T-02-13 | Repudiation | Irrecoverable delete, no audit trail | low | accept | D-13: no trash/undo by design; naming confirm is the safety | closed (accepted) |
| T-02-14 | Tampering | Banner dismissal flag | low | accept | Client session state deciding only whether a nudge renders; no server trust | closed (accepted) |
| T-02-15 | Denial of Service | Save nudge becoming a gate | high | mitigate | Banner in document flow, never overlay, always dismissable; `lib/auth/open-access.test.ts` fails if a route guard appears | closed |
| T-02-16 | Repudiation | Copy misstating whether work is saved | medium | mitigate | Stale-copy sweep grep ran as 02-05 acceptance criterion (no matches) | closed |
| T-02-17 | Spoofing | Dev Clerk keys in production | high | mitigate | Production instance issues pk_live_/sk_live_ and rejects dev keys; exercised in the live-site walkthrough | closed |
| T-02-18 | Spoofing | Google OAuth redirect URI mismatch | medium | mitigate | Redirect URI taken from Clerk's production instance; Google sign-in exercised on the live site | closed |
| T-02-19 | Denial of Service | Deployed site pointing at an unmigrated database | high | mitigate | `0000` proven by live saves since launch. `0001_timezone_aware_timestamps` applied to **production and development** 2026-08-28 (this audit): dev confirmed by live `information_schema.columns` query (`timestamp with time zone`, default `now()`); prod confirmed by `npm run db:migrate:prod` success plus an idempotent re-run showing nothing pending. Resolves WR-03. | closed |

*Status: open · closed · open — below high threshold (non-blocking)*
*Severity: critical > high > medium > low — only open threats at or above workflow.security_block_on count toward threats_open*
*Disposition: mitigate (implementation required) · accept (documented risk) · transfer (third-party)*

---

## Accepted Risks Log

| Risk ID | Threat Ref | Rationale | Accepted By | Date |
|---------|------------|-----------|-------------|------|
| AR-02-01 | T-02-06 | Framework 1MB body default far exceeds snapshot size; raising it would only widen the DoS surface | plan 02-01 (developer) | 2026-08-27 |
| AR-02-02 | T-02-13 | No trash/undo for deletes is a deliberate product decision (D-13); the typed-name confirm is the safety. Revisit in a later phase rather than rediscover | plan 02-04 (developer) | 2026-08-27 |
| AR-02-03 | T-02-14 | Banner dismissal flag is client-side session state by design; tampering costs only a nudge shown/hidden | plan 02-05 (developer) | 2026-08-27 |

---

## Residual Hygiene Notes (not open threats)

- `client_secret_*.json` (Google OAuth) is gitignored and has never been committed, but still sits in the repo working tree — move it out of the repo folder entirely. No rotation needed.
- `.env.example` (three variable names, no values) still needs to be created by hand — the execution sandbox hard-blocks all `.env*` writes. Content was handed over in the 02-06 checkpoint report.

---

## Security Audit Trail

| Audit Date | Threats Total | Closed | Open | Run By |
|------------|---------------|--------|------|--------|
| 2026-08-28 | 20 | 20 | 0 | /gsd-secure-phase (orchestrator L1 verification + live DB queries; T-02-19 closed by applying migration 0001 to prod + dev with user approval) |

---

## Sign-Off

- [x] All threats have a disposition (mitigate / accept / transfer)
- [x] Accepted risks documented in Accepted Risks Log
- [x] `threats_open: 0` confirmed
- [x] `status: verified` set in frontmatter

**Approval:** verified 2026-08-28
