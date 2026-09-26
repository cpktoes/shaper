---
phase: 11
slug: rocker-from-real-blanks
status: verified
# threats_open = count of OPEN threats at or above workflow.security_block_on severity (the blocking gate)
threats_open: 0
asvs_level: 1
created: 2026-09-26
---

# Phase 11 — Security

> Per-phase security contract: threat register, accepted risks, and audit trail.

**How this was verified (2026-09-26).** Every plan in the phase carried a `<threat_model>` written before any code, so the register below was authored at plan time (42 rows across 13 plans; `T-11-SC` is the supply-chain row each plan repeats). Verification ran at ASVS level 1, grep depth, per the secure-phase workflow's short-circuit rule: for each row the orchestrator located the declared mitigation in the code or committed procedure on `rocker-blanks` HEAD (`ae51f4d`) and recorded the file and line under Verification Evidence. No high-severity threat is open, so `threats_open` is 0. One new surface appeared after the plans were written and is registered here as `T-11-40`. Plan 11-13 (the founder's production step) has not run yet; its three controls (T-11-37, T-11-38, T-11-39) are present in the scripts and the documented procedure and are exercised when that step runs.

---

## Trust Boundaries

| Boundary | Description | Data Crossing |
|----------|-------------|---------------|
| committed CSV files → reader | The catalogue files are repo content, but they are text that becomes numbers every screen trusts; a malformed or edited row must fail loudly, not silently become 0 | see 11-01 |
| blank record → pchip | Station values reach the sampler from the database, a saved board or a preset module in later plans; a non-finite value must never reach drawing or fit arithmetic | see 11-01 |
| cookie / localStorage → parser | Browser-held values are user-editable; they reach the server's first paint and the provider | see 11-02 |
| Server Action input → parser | 11-06's action will call this parser on client-sent values | see 11-02 |
| catalogue / saved copy → judging | Blank records reach judging from the database, the seed CSVs or a saved board; search bounds must stay finite | see 11-03 |
| saved/preset rocker and foil values → profile builders | Values arrive from saved boards (validated by the snapshot schema in 11-09) and presets; the builders must not produce NaN | see 11-04 |
| database → RSC page (public read) | Anyone can load /design/rocker; the read must expose only catalogue data and never write | see 11-05 |
| seed script → database | Runs with database credentials from an env file on a developer machine | see 11-05 |
| test-only env switch → server | `SHAPER_BLANKS_SOURCE` changes where the catalogue comes from | see 11-05 |
| client → Server Action | Five numbers arrive over the wire from the browser | see 11-06 |
| database → layout (every route) | The resolver runs on every request, before the production migration exists | see 11-06 |
| catalogue text → SVG | The blank's vendor and name (from a saved board or the catalogue) enter the drawing's accessible name | see 11-07 |
| localStorage / cookie → provider | Browser-held values can be edited by anyone with the device | see 11-08 |
| provider → Server Action | Client-sent values cross to the server | see 11-08 |
| saved snapshot (database, client save call) → `parseSnapshot` | A snapshot is user-controlled JSON; v4 adds an array of up to 32 stations and free text | see 11-09 |
| blank copy → store → drawing | The copy's text (vendor, name, flags) is rendered on screen | see 11-09 |
| generated preset module → client bundle | Catalogue rows ship to every browser through the setup screen | see 11-10 |
| fit-defaults provider → store | Browser-held tip values enter a new board | see 11-10 |
| RSC → client (streamed catalogue) | Up to 158 blank records cross into the browser once per visit | see 11-11 |
| search input → filter | Free text typed by the shaper | see 11-11 |
| catalogue/saved text → DOM | Vendor names, blank names and flags render as text | see 11-11 |
| test server env | The Playwright dev server runs on fake credentials and the seed-CSV catalogue source | see 11-12 |
| developer machine → production database | Production credentials are pulled to a temporary file for two commands | see 11-13 |

---

## Threat Register

| Threat ID | Category | Component | Severity | Disposition | Mitigation | Status |
|-----------|----------|-----------|----------|-------------|------------|--------|
| T-11-01 | Tampering | `lib/blanks/catalog.ts` `rowsToBlankRecords` | medium | mitigate | Header must equal `BLANK_CSV_COLUMNS`; every row exactly 13 fields; a non-empty numeric cell that is not finite throws naming file/line/column; empty → null, never 0 (tested in catalog.test.ts) | closed |
| T-11-02 | Denial of Service | `lib/geometry/pchip.ts` `preparePchip` | medium | mitigate | Throws on any non-finite knot; `sample` returns the first y for a non-finite x and clamps past the ends, so no NaN can propagate into a drawing or a verdict (tested) | closed |
| T-11-03 | Tampering | `lib/geometry/blank-fit.ts` `boardOnBlank` | low | mitigate | Placement clamped on read; samples outside the blank's length read thickness and width 0 so the fit fails rather than extrapolating (Pitfall 8, tested) | closed |
| T-11-SC (11-01) | Tampering | npm installs | low | accept | This plan installs nothing and does not touch package.json (D-20); the CSV reader is hand-rolled | closed (accepted risk) |
| T-11-04 | Tampering | `parseFitDefaultValue` / `parseFitDefaultsPreference` | high | mitigate | Allow-list: finite numbers inside per-field bounds only; anything else null; non-object input → five nulls (tested) | closed |
| T-11-05 | Denial of Service | `readFitDefaultsCookie` | medium | mitigate | try/catch around decodeURIComponent and JSON.parse; returns five nulls, never throws (tested) | closed |
| T-11-06 | Information Disclosure | cookie contents | low | accept | Five non-sensitive shaping numbers; no Secure/HttpOnly by design so the browser can write it (same as the units cookie) | closed (accepted risk) |
| T-11-07 | Denial of Service | `judgeBlank` / `nearestFittingPlacement` loops | medium | mitigate | Iterations bounded by `placementRange` (itself bounded by the blank's length) over fixed 1/4" and 1/16" steps; the whole-catalogue budget test (< 250 ms) fails if a change makes it explode | closed |
| T-11-08 | Tampering | reason text | low | accept | Strings are composed from numbers through the display boundary; catalogue names are passed through as data and rendered as React text by later plans (never as HTML) | closed (accepted risk) |
| T-11-09 | Denial of Service | `buildFallbackProfile` / `buildBlankProfile` | medium | mitigate | Built on `preparePchip`, which throws on non-finite knots before anything samples; placement clamped on read; out-of-blank samples read 0 (11-01) | closed |
| T-11-10 | Tampering | golden fixtures | low | mitigate | Fixtures change only through their own `npm run golden:*` scripts, checked by the `git status` acceptance criterion | closed |
| T-11-11 | Elevation of Privilege | `lib/db/blanks.ts` | high | mitigate | Read-only by construction: ownership test asserts only `db.select` from `blanks`, no insert/update/delete, no owner parameter; blanks has no user column | closed |
| T-11-12 | Information Disclosure | `loadPickableBlanks` | low | accept | Returns only public catalogue data (vendor, name, lengths, station numbers, printed flags); no user data in the table | closed (accepted risk) |
| T-11-13 | Denial of Service | `loadPickableBlanks` | medium | mitigate | Bounded result (≤ 162 rows, explicit column projection), never rejects; missing table/zero rows/failed read → `unavailable` so the page renders E4 | closed |
| T-11-14 | Tampering | `scripts/seed-blanks.ts` upsert | high | mitigate | Drizzle parameterised insert; `sql.raw` only for `excluded.<column>` built from schema column names, never from CSV data; CSV parsed by the tested strict reader (11-01) | closed |
| T-11-15 | Information Disclosure | env file handling in the seed | high | mitigate | Env loaded with `process.loadEnvFile`, never printed; production file pulled to a temp name and deleted by a `trap` on exit; no `.env*` written by any executor | closed |
| T-11-16 | Tampering | `SHAPER_BLANKS_SOURCE` | medium | mitigate | Set only in `playwright.config.ts` webServer.env (grep-checked); on production it is unset, so the database path is the only path | closed |
| T-11-SC (11-05) | Tampering | npx tsx | medium | mitigate | `npx --no-install` everywhere, so npx can only run the tsx already locked in package-lock.json (4.23.12, integrity-pinned) and can never download a package | closed |
| T-11-17 | Elevation of Privilege | `saveFitDefaultsPreference` | high | mitigate | Identity only from `await auth()`, first statement; no user/owner parameter; upsert keyed on the session's `clerkUserId` — all asserted by `lib/db/ownership.test.ts` | closed |
| T-11-18 | Tampering | `saveFitDefaultsPreference` input | high | mitigate | Every field null or through `parseFitDefaultValue` (finite, bounded); any invalid field refuses the whole write; Drizzle parameterised upsert, no raw SQL | closed |
| T-11-19 | Denial of Service | `resolveFitDefaultsHandoff` on every route | medium | mitigate | Account read inside try/catch → null; projection of five columns only, so the existing units/print reads never select a column that does not exist yet | closed |
| T-11-20 | Repudiation / Availability | production migration order | medium | mitigate | Development branch only here; production is the founder's step after the deploy (11-13), per CLAUDE.md's Database section | closed |
| T-11-21 | Tampering | `RockerViewer` aria-label with catalogue text | medium | mitigate | Rendered as a React attribute value only, never `dangerouslySetInnerHTML` (the rewritten `drag-readout-chip.test.ts` guard asserts it) | closed |
| T-11-22 | Denial of Service | frame arithmetic with a corrupt blank span | low | mitigate | Negative/non-finite span values resolve to 0 in `rockerViewLayout` (tested), mirroring the existing corrupt-length fallback | closed |
| T-11-23 | Tampering | `FitDefaultsProvider` reading storage | medium | mitigate | Raw string snapshot parsed through the 11-02 allow-list; garbage → five nulls → defaults; try/catch around storage access | closed |
| T-11-24 | Tampering | dialog input | medium | mitigate | `MeasureField` + `commitTypedMeasure` parse and clamp to `FIT_DEFAULTS_RANGE_IN`; the action re-validates server-side (11-06) | closed |
| T-11-25 | Denial of Service | `useSyncExternalStore` snapshot | low | mitigate | Snapshot is a primitive string, so a new object per read cannot trigger a render loop | closed |
| T-11-26 | Tampering / Denial of Service | `boardBlankSchema` in `lib/models/design-snapshot.ts` | high | mitigate | Bounded zod schema: ≤ 32 stations, strings ≤ 120/400, finite numbers in ranges, placement ±4000 mm, offsets ±50 mm, pickable refine; `saveModel` re-parses every save before writing (existing), `parseSnapshot` on every read | closed |
| T-11-27 | Tampering | catalogue text on the DATASHEET and drawing | medium | mitigate | Rendered as React text only; no `dangerouslySetInnerHTML` (`drag-readout-chip.test.ts` guard for the viewer; review for the datasheet) | closed |
| T-11-28 | Repudiation | undo/autosave losing a pick | low | mitigate | `blank` in every hand-written list, enforced by `design-store.test.ts` | closed |
| T-11-29 | Tampering | `lib/blanks/preset-blanks.generated.json` | medium | mitigate | Written only by the script from the committed CSVs through the tested reader; the drift test fails if a row differs from the CSV or an extra blank appears | closed |
| T-11-30 | Tampering | live tip defaults into the store | low | mitigate | Values come through the 11-02 allow-list (finite, 1/8"–1 1/2") via the provider; the store only copies them | closed |
| T-11-SC (11-10) | Tampering | npx tsx | low | mitigate | `npx --no-install` so npx can never download; no package.json change (D-20) | closed |
| T-11-31 | Denial of Service | `matchesBlankSearch` | medium | mitigate | Plain substring search, never a RegExp built from user text (grep-checked; metacharacter test) | closed |
| T-11-32 | Tampering | catalogue and flag text in the picker, flag and card | medium | mitigate | Rendered as React text only; no `dangerouslySetInnerHTML` anywhere in the new components | closed |
| T-11-33 | Information Disclosure | streamed catalogue | low | accept | Public catalogue data only (11-05); no user data in the payload | closed (accepted risk) |
| T-11-34 | Denial of Service | verdict recomputation | low | mitigate | Memoised on non-placement inputs only (D-07); 1–7 ms per pass measured; a slider move samples one prepared blank | closed |
| T-11-35 | Information Disclosure | test credentials | medium | mitigate | No new credential is added; the existing fake keys stay word-and-hyphen shaped so no secret scanner matches (push protection) | closed |
| T-11-36 | Tampering | baseline images | low | mitigate | One named re-record for two files, guarded by hash comparison of the other three and a pixel-region check on VOLUME | closed |
| T-11-37 | Information Disclosure | `.env.production.pull` | high | mitigate | Pulled only inside `bash -c` with an EXIT trap that deletes it; `db:migrate:prod` already uses the same trap; no command prints the URL | closed (control in place; exercised when 11-13 runs) |
| T-11-38 | Repudiation / Availability | migration order | high | mitigate | Additive migrations run BEFORE the deploy (CLAUDE.md Database, amended after CR-01), so the old code never meets a column it cannot insert and the new code never meets a missing table; the fail-soft reads (E4 state) remain as a second net for previews and for any future gap | closed (control in place; exercised when 11-13 runs) |
| T-11-39 | Tampering | production seed | medium | mitigate | The same idempotent, parameterised upsert proven twice on the development branch; `--check` is read-only | closed (control in place; exercised when 11-13 runs) |
| T-11-40 | Information Disclosure | `next.config.ts` `allowedDevOrigins` | low | accept | Development-only widening (`"**.*"`) so a phone on the home Wi-Fi can load the dev server's scripts; added at the founder's request during UAT (commit ae51f4d). While `npm run dev` runs, any dotted origin — including a website open in the founder's browser — may request dev resources from the local server. No effect on a production build. | closed (accepted risk) |

*Status: open · closed · open — below high threshold (non-blocking)*
*Severity: critical > high > medium > low — only open threats at or above workflow.security_block_on (`high`) count toward threats_open*
*Disposition: mitigate (implementation required) · accept (documented risk) · transfer (third-party)*

Totals: 43 threats · 43 closed · 0 open · 0 at or above the `high` threshold open.

---

## Verification Evidence

| Threat ID | Where the mitigation was found |
|-----------|--------------------------------|
| T-11-01 | `lib/blanks/catalog.ts` lines 49–55 (header must equal `BLANK_CSV_COLUMNS`, empty file throws); `catalog.test.ts` |
| T-11-02 | `lib/geometry/pchip.ts` lines 108–124 (non-finite knot throws; non-finite x returns the first y) |
| T-11-03 | `lib/geometry/blank-fit.ts` `clampPlacement` (line 144), applied on read at lines 223 and 448 |
| T-11-04 | `lib/fit-defaults-preference.ts` `parseFitDefaultValue` lines 95–102 (finite, per-field bounds) and `parseFitDefaultsPreference` lines 140–153 (allow-listed keys, non-object → null); `fit-defaults-preference.test.ts` |
| T-11-05 | `lib/fit-defaults-preference.ts` try/catch pairs at lines 256–278 around decode and parse |
| T-11-06 | accept — five non-sensitive shaping numbers, documented in 11-02-PLAN.md |
| T-11-07 | `lib/geometry/blank-fit.ts` `placementRange` (line 135) bounds every loop; `blank-fit.test.ts` line 727 budgets the whole catalogue under 250 ms |
| T-11-08 | accept — reason strings are numbers through the display boundary plus catalogue names as data (11-03-PLAN.md); rendered as React text (T-11-27/32) |
| T-11-09 | every profile goes through `preparePchip` (T-11-02) and `clampPlacement` (T-11-03) |
| T-11-10 | `git diff --stat main...HEAD -- lib/geometry/__fixtures__/` is empty — no fixture changed in the phase |
| T-11-11 | `lib/db/blanks.ts` holds one `.select` (line 154) and no insert/update/delete; `lib/db/ownership.test.ts` lines 171–180 assert it |
| T-11-12 | accept — the read projects public catalogue columns only (`lib/db/blanks.ts` lines 32–35) |
| T-11-13 | `lib/db/blanks.ts` explicit projection (line 154), malformed rows dropped through `isWellFormedBlankRecord` (line 122), catch at line 190 returns the empty list |
| T-11-14 | `scripts/seed-blanks.ts` lines 72–91: `.insert(blanks).values(...)` parameterised; `sql.raw` receives only `excluded."<schema column name>"` |
| T-11-15 | `scripts/seed-blanks.ts` lines 36–58: `process.loadEnvFile`, the connection string never printed; the only message names the missing variable |
| T-11-16 | `SHAPER_BLANKS_SOURCE` set in `playwright.config.ts` line 51 only; read at `lib/db/blanks.ts` line 176; tests stub it |
| T-11-17 | `app/actions/fit-defaults.ts` line 42: `const { userId } = await auth()` is the first statement; no user parameter; upsert keyed on `userPreferences.clerkUserId` (line 51) |
| T-11-18 | `app/actions/fit-defaults.ts` parses each present field through `parseFitDefaultValue` before the upsert; `lib/db/fit-defaults-save.test.ts` (added by the review fix WR-02) proves only given fields are written |
| T-11-19 | `lib/fit-defaults-server.ts` lines 36–39: account read in try/catch, degrades to null |
| T-11-20 | `drizzle/0004_blanks.sql` and `0005_fit_defaults.sql` applied to the development branch by 11-05/11-06; production order recorded in CLAUDE.md (Database) and `.continue-here.md` |
| T-11-21 | `components/viewer/drag-readout-chip.test.ts` lines 63, 103–107: no `dangerouslySetInnerHTML`, vendor and name only in a plain `aria-label` |
| T-11-22 | `components/rocker/rocker-view-frame.ts` lines 491–546 (non-finite or non-positive → 0 / minimum); `rocker-view-frame.test.ts` lines 341–369 |
| T-11-23 | `components/fit-defaults-provider.tsx` lines 83–95: storage reads in try/catch, parsed through `parseFitDefaultsPreference` |
| T-11-24 | `components/fit-defaults-dialog.tsx` lines 39, 131, 141: `MeasureField` with `FIT_DEFAULTS_RANGE_IN`; the action re-validates (T-11-18) |
| T-11-25 | `components/fit-defaults-provider.tsx` line 31: `useSyncExternalStore` over a primitive string snapshot |
| T-11-26 | `lib/models/design-snapshot.ts` lines 98–175: `SNAPSHOT_BOARD_LENGTH_MM`, `BLANK_PLACEMENT_MAX_MM = 4000`, `boardBlankSchema`; blank dropped outside the length range at line 355 |
| T-11-27 | no `dangerouslySetInnerHTML` in `components/rocker/*` (grep on HEAD) |
| T-11-28 | `components/design/design-store.test.ts` lines 64–68 (`blank` in the history snapshot object and its dependency array) |
| T-11-29 | `lib/blanks/preset-blanks.test.ts` — the drift test against the committed CSVs |
| T-11-30 | `components/design/design-store.tsx` lines 420–422 read the provider's allow-listed defaults only |
| T-11-31 | `lib/geometry/blank-reasons.ts` line 244 `matchesBlankSearch` — plain substring; no `new RegExp` in `components/rocker` or `lib/blanks`; `blank-reasons.test.ts` line 392 |
| T-11-32 | no `dangerouslySetInnerHTML` in the new components (grep on HEAD) |
| T-11-33 | accept — same public payload as T-11-12 |
| T-11-34 | `components/rocker/use-blank-list.ts` lines 86–112: catalogue prepared once per records array, verdict list memoised |
| T-11-35 | `git diff main...HEAD -- playwright.config.ts` touches no key line; the fake keys are unchanged |
| T-11-36 | `git diff --stat main...HEAD -- e2e/desktop-baseline.spec.ts-snapshots/` shows exactly two files (ROCKER, VOLUME) |
| T-11-37 | `package.json` `db:migrate:prod` carries `trap 'rm -f .env.production.pull' EXIT INT TERM`; the seed command in 11-13-PLAN.md line 93 and `.continue-here.md` line 37 carries the same trap |
| T-11-38 | CLAUDE.md Database section (amended after CR-01): additive migrations run BEFORE the deploy; `.continue-here.md` lists the steps in that order (migrate → seed → merge/deploy → live checks) |
| T-11-39 | the same upsert as T-11-14, proven idempotent on the development branch (162 of 162 unchanged on a re-run); `--check` skips the write ("Read-only from here on", `scripts/seed-blanks.ts` line 93) |
| T-11-SC (all plans) | `git diff --stat main...HEAD -- package.json package-lock.json` is empty (D-20: nothing installed); every scripted run uses `npx --no-install tsx` (`scripts/*.ts` headers, 11-13-PLAN.md, `.continue-here.md`) |
| T-11-40 | `next.config.ts` (commit ae51f4d) — development-only; Next.js refuses a bare `*`, `"**.*"` is the widest pattern it accepts |

---

## Accepted Risks Log

| Risk ID | Threat Ref | Rationale | Accepted By | Date |
|---------|------------|-----------|-------------|------|
| AR-11-01 | T-11-SC (11-01) | The plan installs nothing and does not touch package.json (D-20); the CSV reader is hand-rolled | founder, via plan approval | 2026-09-26 |
| AR-11-02 | T-11-06 | The fit-defaults cookie holds five non-sensitive shaping numbers; no Secure/HttpOnly by design so the browser can write it, the same as the units cookie | founder, via plan approval | 2026-09-26 |
| AR-11-03 | T-11-08 | Reason strings are numbers through the display boundary; catalogue names pass through as data and render as React text | founder, via plan approval | 2026-09-26 |
| AR-11-04 | T-11-12 | The blank read returns public catalogue data only; no user data in the payload | founder, via plan approval | 2026-09-26 |
| AR-11-05 | T-11-33 | The streamed catalogue is the same public data as T-11-12 | founder, via plan approval | 2026-09-26 |
| AR-11-06 | T-11-40 | Development-only allowance so a phone on the home Wi-Fi can use `npm run dev`; requested by the founder during UAT ("allow for all"); no effect on a production build | founder, in UAT | 2026-09-26 |

*Accepted risks do not resurface in future audit runs.*

---

## Security Audit Trail

| Audit Date | Threats Total | Closed | Open | Run By |
|------------|---------------|--------|------|--------|
| 2026-09-26 | 43 | 43 | 0 | Claude (orchestrator, secure-phase L1 grep verification on HEAD ae51f4d) |

---

## Sign-Off

- [x] All threats have a disposition (mitigate / accept / transfer)
- [x] Accepted risks documented in Accepted Risks Log
- [x] `threats_open: 0` confirmed
- [x] `status: verified` set in frontmatter

**Approval:** verified 2026-09-26 — the three production-step controls (T-11-37, T-11-38, T-11-39) are exercised when the founder runs plan 11-13.
