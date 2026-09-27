---
phase: 12
slug: foil-the-way-a-shaper-cuts-it
status: verified
# threats_open = count of OPEN threats at or above workflow.security_block_on severity (the blocking gate)
threats_open: 0
asvs_level: 1
created: 2026-09-27
---

# Phase 12 — Security

> Per-phase security contract: threat register, accepted risks, and audit trail.

**How this was verified (2026-09-27).** Every plan in the phase carried a `<threat_model>` written before any code, so the register below was authored at plan time: 35 rows across 10 plans (27 mitigate, 8 accept; `T-12-SC` is the supply-chain row eight plans repeat). Verification ran at ASVS level 1, grep depth, per the secure-phase workflow's short-circuit rule: for each row the orchestrator located the declared mitigation in the code or the recorded procedure on `main` (code last changed at `a7dc3e4`; the phase itself merged at `125a90f` and its production step, plan 12-10, ran before that merge) and recorded the file and line under Verification Evidence. No threat at or above the `high` gate is open, so `threats_open` is 0. The UAT (8 of 8 passed, 2026-09-27) added no code, so no surface appeared after planning. Five quick tasks landed on `main` after the phase merge (260926-uub, -wkh, -wmf, 260927-0fq, -ef8); each carried its own plan-time threat model and is outside this register — the one that added a column and a Server Action (260926-wmf) is held by the same ownership test this register relies on (`lib/db/ownership.test.ts` line 72 names `app/actions/blank-makers.ts`).

---

## Trust Boundaries

| Boundary | Description | Data Crossing |
|----------|-------------|---------------|
| saved row / browser save → `parseSnapshot` | A saved board is untrusted input; version 5 adds three fields on the blank and a carry-over that runs geometry on read | see 12-01 |
| generated fixture → tests | The golden is the only source of Phase 11's numbers once `blank-fit.ts` changes; a hand edit would silently weaken named test (f) | see 12-01 |
| worktree → Neon development branch | drizzle-kit and the check script read the development connection string from the env file named on the command line | see 12-02 |
| schema object → every `user_preferences` insert | Drizzle names every column of the table on insert (CR-01) — the schema and the database must agree before any insert runs | see 12-02 |
| cookie / localStorage / account row → preference parse | Stored settings are untrusted; the preference now carries a non-number (Tip Style) for the first time | see 12-03 |
| client → `saveFitDefaultsPreference` (Server Action) | A patch arrives over the wire and names columns to write | see 12-03 |
| dialog → provider → Server Action | A Tip Style value travels from a tap to the account row | see 12-04 |
| slider → design store → autosave | A Deck Skin value becomes part of the saved board, re-validated by `saveModel` | see 12-05 |
| session → `resolveCarryOverTipStyle` → `user_preferences` | The account's Tip Style is read for the signed-in shaper only | see 12-06 |
| stored `models.snapshot` → server parse | Saved rows are untrusted; the carry-over runs on them | see 12-06 |
| worktree → development database | The check script reads every saved row | see 12-06 |
| board settings → fit judging (browser) | Every value is the shaper's own, already bounded by the sliders and the saved-board schema | see 12-07 |
| pill tap → design store → autosave | Two enum values become part of the saved board | see 12-08 |
| catalogue text → DATASHEET and the drawing's accessible name | A blank's vendor and name (saved with the board) render as React text and an attribute value | see 12-09 |
| developer machine → production database | Production credentials are pulled to a temporary file for the migrate and two read-only checks | see 12-10 |

---

## Threat Register

| Threat ID | Category | Component | Severity | Disposition | Mitigation | Status |
|-----------|----------|-----------|----------|-------------|------------|--------|
| T-12-01 | Tampering | `boardBlankSchema` (deckSkin, tipStyle, fineTuneSurface) | medium | mitigate | zod enums for the two choices, `deckSkin` bounded 0–50 mm, all-three-or-none refine; `saveModel` re-parses every save; rejection tests for each malformed shape | closed |
| T-12-02 | Denial of Service | carry-over in `parseSnapshot` | medium | mitigate | Runs only on a blank that already passed the bounded, pickable schema; carried offsets clamped to ±50 mm so the result re-parses; the rack still drops only a card that throws (WR-05) | closed |
| T-12-03 | Tampering | `phase11-foil-golden.json` | low | mitigate | Generated only by the script, whose guard refuses unless `blank-fit.ts` / `pchip.ts` equal tag v1.3; provenance field; a re-run must produce identical bytes | closed |
| T-12-04 | Repudiation | stale tab re-stamping a Phase 11 blank as version 5 | medium | mitigate | Carry-over decided by the blank's shape (`hasPhase11Blank`), tested with each shape under the other version number | closed |
| T-12-SC (12-01) | Tampering | npm installs | low | accept | Installs nothing, does not touch package.json (D-20) | closed (accepted risk) |
| T-12-05 | Information Disclosure | `scripts/check-preference-columns.ts`, the migrate command | high | mitigate | The script loads the env file itself (`process.loadEnvFile`) and prints only column names, types and a count — never the URL or row data; no `.env*` is read, printed or copied by hand | closed |
| T-12-06 | Denial of Service (availability) | the three new columns vs. deployed code | high | mitigate | Additive, nullable, no default — the deployed Phase 11 code ignored them; development migrated inside 12-02; production migrated by the founder BEFORE the deploy (12-10) | closed |
| T-12-07 | Tampering | migration 0006 content | high | mitigate | Generated by drizzle-kit, never hand-edited; exactly three ADD COLUMN lines and no DROP; `extra_center_thickness_mm` kept | closed |
| T-12-SC (12-02) | Tampering | npm installs | low | accept | Nothing installed; `npx --no-install` only | closed (accepted risk) |
| T-12-08 | Tampering | `parseFitDefaultsPreference`, `parseTipStyleValue` | medium | mitigate | Allow-list per key: finite millimetres inside each range, Tip Style exactly `pinDeck` / `bottom`, anything else `null`; unknown keys (a legacy `extraCenterThickness` among them) ignored; unit-tested | closed |
| T-12-09 | Tampering | `parseFitDefaultsPatch` → column writes | high | mitigate | The whole patch is rejected on any unknown key or invalid value, so a crafted call can neither write a column outside the seven nor write half a change; `FIT_DEFAULTS_COLUMNS` is the only key→column map | closed |
| T-12-10 | Elevation of Privilege | `saveFitDefaultsPreference` | medium | mitigate | Unchanged: identity from `await auth()` only, upsert keyed on `clerkUserId`; `lib/db/ownership.test.ts` pins both | closed |
| T-12-11 | Denial of Service | list re-judging on a Deck Skin / Tip Style default change | low | mitigate | Verdicts memoised on the board, its cut and the three rules only — never the placement; the "under 250 ms" judging test stays green | closed |
| T-12-12 | Tampering | desktop baselines | low | mitigate | One named re-record of one image, guarded by the diff inspection and the four unchanged hashes | closed |
| T-12-13 | Tampering | `setDefault("tipStyle", …)` → `saveFitDefaultsPreference` | medium | mitigate | The pill only ever emits its two literal options; the server re-validates every patch with `parseFitDefaultsPatch`; the browser copy is re-parsed through the same allow-list on read | closed |
| T-12-14 | Spoofing (UI) | `TwoOptionToggle` accessible name | low | mitigate | `aria-label` is a constant passed by the caller (`"Tip Style"`), never user text; React escapes it | closed |
| T-12-SC (12-04) | Tampering | npm installs | low | accept | Nothing installed | closed (accepted risk) |
| T-12-15 | Tampering | `setDeckSkin` → saved snapshot | low | mitigate | The slider can only produce values on the bounded 1/16"–1/2" grid (`measureSlider` over `FIT_DEFAULTS_RANGE_IN.deckSkin`); every save is re-parsed through 12-01's bounded version-5 schema | closed |
| T-12-16 | Denial of Service | list re-judging on a Deck Skin drag | low | mitigate | Verdicts memoised on the board's cut, never the placement; a drag re-judges once per committed value inside the 250 ms budget; no network request (e2e counts zero) | closed |
| T-12-SC (12-05) | Tampering | npm installs | low | accept | Nothing installed | closed (accepted risk) |
| T-12-17 | Elevation of Privilege / Information Disclosure | `resolveCarryOverTipStyle` | high | mitigate | No parameters; identity only from `await auth()` inside `resolveFitDefaultsHandoff`; returns one enum value and never another shaper's data; `ownership.test.ts` pins every action's `auth()`-first shape | closed |
| T-12-18 | Denial of Service (availability) | rack and save paths before production migrates | high | mitigate | The account read is inside the existing try/catch and degrades to the cookie or Pin deck; the preference read is skipped entirely unless a Phase 11 blank is present; rack parse failures still drop only one card (WR-05) | closed |
| T-12-19 | Information Disclosure | `scripts/check-saved-boards.ts` | medium | mitigate | Loads the env file itself; prints counts and, on failure, row ids only — never snapshots, names, user ids or the connection string; select-only | closed |
| T-12-SC (12-06) | Tampering | npm installs | low | accept | Nothing installed | closed (accepted risk) |
| T-12-20 | Denial of Service | `fitAt` extra checks inside the placement search | low | mitigate | Two constant-time comparisons per sampled station/placement; the whole-catalogue judging tests stay under 250 ms | closed |
| T-12-SC (12-07) | Tampering | npm installs | low | accept | Nothing installed | closed (accepted risk) |
| T-12-21 | Tampering | `setTipStyle` / `setFineTuneSurface` → saved snapshot | low | mitigate | The pills emit only their two literal options; every save is re-parsed through 12-01's version-5 schema (`z.enum`) on the server | closed |
| T-12-22 | Spoofing (UI) | toggle accessible names | low | mitigate | Constant `aria-label` strings, React-escaped | closed |
| T-12-SC (12-08) | Tampering | npm installs | low | accept | Nothing installed | closed (accepted risk) |
| T-12-23 | Tampering (XSS) | `rocker-datasheet.tsx`, `rocker-viewer.tsx` aria-label | medium | mitigate | Vendor and name reach the page only as React text and a plain attribute value — no `dangerouslySetInnerHTML`; the saved copy is bounded by the version-5 schema | closed |
| T-12-24 | Tampering | the type contract | low | mitigate | Required cut fields plus the deleted fallback mean a board without a cut cannot compile | closed |
| T-12-SC (12-09) | Tampering | npm installs | low | accept | Nothing installed | closed (accepted risk) |
| T-12-25 | Information Disclosure | `.env.production.pull` | high | mitigate | Pulled only inside `bash -c` with an EXIT trap that deletes it; `db:migrate:prod` carries the same trap; neither check prints the URL or any row data | closed |
| T-12-26 | Denial of Service (availability) / Repudiation | migration order | high | mitigate | The additive migration ran BEFORE the deploy, so the old code never met a column it could not insert and the new code never met a missing one; the fail-soft reads remain as a second net | closed |
| T-12-27 | Tampering | an early DROP of `extra_center_thickness_mm` | high | mitigate | 0006 holds no DROP; the check prints the column kept; the DROP is a separate, later quick task | closed |

*Status: open · closed · open — below high threshold (non-blocking)*
*Severity: critical > high > medium > low — only open threats at or above workflow.security_block_on (`high`) count toward threats_open*
*Disposition: mitigate (implementation required) · accept (documented risk) · transfer (third-party)*

Totals: 35 threats · 35 closed · 0 open · 0 at or above the `high` threshold open.

---

## Verification Evidence

| Threat ID | Where the mitigation was found |
|-----------|--------------------------------|
| T-12-01 | `lib/models/design-snapshot.ts` lines 175 (`BLANK_DECK_SKIN_MAX_MM = 50`), 196–198 (`deckSkin` 0–50, `z.enum(["pinDeck","bottom"])`, `z.enum(["deck","bottom"])`), 200–202 (all-three-or-none refine); `saveModel` re-parses every save (Phase 11, T-11-26); rejection tests recorded in 12-01 SUMMARY |
| T-12-02 | `lib/models/design-snapshot.ts` line 401 (`carryPhase11Blank` runs on the already-parsed blank), 365–366 `clampOffset` against `BLANK_OFFSET_MAX_MM = 50` (line 172); `lib/geometry/phase11-foil.ts` line 80 (offsets returned unclamped, the snapshot owns the bound); `design-snapshot.test.ts` line 354 (a re-saved, reopened carried board changes nothing) |
| T-12-03 | `scripts/extract-phase11-foil-golden.ts` line 49 (`TAG = "v1.3"`), 95 (refuses to run unless both files are byte-identical to `git show v1.3:<path>`), 262–265 (provenance written into the fixture); fixture `lib/geometry/__fixtures__/phase11-foil-golden.json` |
| T-12-04 | `lib/models/design-snapshot.ts` lines 349–354 (`hasPhase11Blank` decides by the absence of a `tipStyle` key, never the version); `design-snapshot.test.ts` lines 380–391 (each shape under the other version number) |
| T-12-05 | `scripts/check-preference-columns.ts` lines 59–61 (inherited `DATABASE_URL` dropped, then `process.loadEnvFile`), 75–87 (two selects, nothing else), 94–98 (prints column names, types and a count only); the production one-liner at line 33 carries the delete-on-exit trap |
| T-12-06 | `drizzle/0006_deck_skin_planer_tip_style.sql` lines 1–3: three `ADD COLUMN`s, nullable, no default; 12-10 SUMMARY steps 1–3 (production migrated, read-only proof, then merge and deploy) |
| T-12-07 | the same file holds no `DROP` (grep); `extra_center_thickness_mm` still declared in `drizzle/0005_fit_defaults.sql` line 2 and `lib/db/schema.ts` line 85 |
| T-12-08 | `lib/fit-defaults-preference.ts` line 122 (`parseFitDefaultValue`: finite, per-field bounds), 138–139 (`parseTipStyleValue`: exactly `pinDeck` / `bottom`, else null), 155–159 (`parseFitDefaultsPreference` ignores unknown keys including the legacy `extraCenterThickness`) |
| T-12-09 | `lib/fit-defaults-preference.ts` lines 182–188 (`parseFitDefaultsPatch` rejects the whole patch on any unknown or retired key or bad value), 223 (`FIT_DEFAULTS_COLUMNS`, the only key→column map, used at 249 and 256–259); `app/actions/fit-defaults.ts` lines 48–52; 12-03 SUMMARY's save-SQL test (Restore Defaults writes exactly the seven columns plus `updated_at`) |
| T-12-10 | `app/actions/fit-defaults.ts` line 45 (`const { userId } = await auth()` first), 52–54 (upsert keyed on `clerkUserId`); `lib/db/ownership.test.ts` lines 72–88 (auth before any database call) and 129–132 (exactly one export) |
| T-12-11 | `components/rocker/use-blank-list.ts` lines 19–20 and 89 (placement absent from every dependency list on purpose), 108 (the cut memo), 143–145 (the fit context memo); `lib/geometry/blank-fit.test.ts` lines 1134–1140 (whole catalogue under 250 ms) |
| T-12-12 | `git diff --stat 125a90f^1 125a90f -- e2e/desktop-baseline.spec.ts-snapshots/` shows exactly one file (`rocker-desktop-desktop-darwin.png`); UAT test 8 reviewed the before/after pair with a difference picture (1.9% of pixels, all in the blank-list intro and the rows it pushed down) |
| T-12-13 | `components/fit-defaults-dialog.tsx` line 84 (`TIP_STYLE_OPTIONS = ["pinDeck", "bottom"] as const`) fed to the toggle at line 164; server re-validation is T-12-09; the read path is T-12-08 |
| T-12-14 | `components/fit-defaults-dialog.tsx` lines 82 (`TIP_STYLE_LABEL = "Tip Style"`) and 168 (`ariaLabel="Tip Style"`); `components/viewer/two-option-toggle.tsx` line 46 (`aria-label={ariaLabel}`, a prop the caller passes as a literal) |
| T-12-15 | `components/rocker/board-on-blank.tsx` line 91 (`DECK_SKIN_RANGE_IN = FIT_DEFAULTS_RANGE_IN.deckSkin`) and 114 (`measureSlider` over it); `lib/fit-defaults-preference.ts` line 98 (1/16"–1/2" in 1/16" steps); `components/design/design-store.tsx` line 891 (`setDeckSkin`); the 0–50 mm schema bound of T-12-01 on every save |
| T-12-16 | the memo evidence of T-12-11; `e2e/rocker-cut.spec.ts` line 105 (a Deck Skin drag moves the centre's foam off the bottom and the passes "with no request") |
| T-12-17 | `lib/fit-defaults-server.ts` line 34 (`await auth()` inside `resolveFitDefaultsHandoff`), 63–69 (`resolveCarryOverTipStyle` takes no parameters and returns one enum value); callers gate on `hasPhase11Blank` (`app/page.tsx` line 84; `app/design/actions.ts` lines 56, 120, 156); `lib/db/ownership.test.ts` line 72 |
| T-12-18 | `lib/fit-defaults-server.ts` lines 40–42 and 67–69 (try/catch, degrading to null and the out-of-the-box Pin deck); `app/page.tsx` line 84 (the read runs only when some row has a Phase 11 blank); the WR-05 one-card drop is unchanged |
| T-12-19 | `scripts/check-saved-boards.ts` lines 55–57 (`process.loadEnvFile`), 88–89 (one select of id and snapshot), 199–204 (prints counts and row ids only) |
| T-12-20 | `lib/geometry/blank-fit.ts` line 424 (`fitAt`); `lib/geometry/blank-fit.test.ts` lines 1134 and 1572 (both whole-catalogue budgets under 250 ms, including the nothing-fits case) |
| T-12-21 | `components/rocker/rocker-controls.tsx` lines 371–372 (`options={["deck", "bottom"] as const}`) and 431–432 (`options={["pinDeck", "bottom"] as const}`); the `z.enum`s of T-12-01 on every save |
| T-12-22 | `components/rocker/rocker-controls.tsx` lines 376 (`ariaLabel="Fine-tune off"`) and 436 (`ariaLabel="Tip Style"`); `two-option-toggle.tsx` line 46 |
| T-12-23 | `grep -rn dangerouslySetInnerHTML components/rocker/` finds nothing on `main`; the saved blank copy passes `blankRecordSchema` (`lib/models/design-snapshot.ts` line 182), the bounded record schema Phase 11 verified under T-11-26 (identity strings at most 120 characters, line 44) |
| T-12-24 | `lib/geometry/blank.ts` lines 68–70 (`BlankCut` fields required) and 100–104 (the board's blank carries `deckSkin`, `tipStyle`, `fineTuneSurface` as required fields); `npm run build` and `npx tsc --noEmit` clean on `main` (2026-09-27) |
| T-12-25 | `package.json` line 16 (`db:migrate:prod` with `trap 'rm -f .env.production.pull' EXIT INT TERM`); `scripts/check-preference-columns.ts` line 33 (the same trap around the read-only check); 12-10 SUMMARY steps 1–2 (the trap removed the file; the checks printed only counts) |
| T-12-26 | `CLAUDE.md` Database section, line 59 ("Additive changes migrate production first; removals wait for the deploy"); 12-10 SUMMARY lines 30–40 (migrate, read-only proof, then the `125a90f` merge pushed at 04:48 UTC and Ready 30 s later) |
| T-12-27 | `drizzle/0006_deck_skin_planer_tip_style.sql` holds no `DROP`; `lib/db/schema.ts` line 85 still declares `extra_center_thickness_mm`; the DROP is deferred to its own later quick task (12-10 plan) |
| T-12-SC (all eight plans) | `git diff --stat 125a90f^1 125a90f -- package.json package-lock.json` is empty (nothing installed across the phase); every scripted run uses `npx --no-install tsx` (`scripts/extract-phase11-foil-golden.ts` line 9, `scripts/generate-preset-blanks.ts` line 6, `scripts/check-preference-columns.ts` lines 27–33) |

---

## Accepted Risks Log

| Risk ID | Threat Ref | Rationale | Accepted By | Date |
|---------|------------|-----------|-------------|------|
| AR-12-01 | T-12-SC (plans 12-01, 12-02, 12-04, 12-05, 12-06, 12-07, 12-08, 12-09) | The phase installs nothing and never touches package.json or the lockfile (D-20), confirmed by the empty package diff across the phase merge; every scripted run is `npx --no-install`, so npx can never download a package | founder, via plan approval | 2026-09-26 |

*Accepted risks do not resurface in future audit runs.*

---

## Security Audit Trail

| Audit Date | Threats Total | Closed | Open | Run By |
|------------|---------------|--------|------|--------|
| 2026-09-27 | 35 | 35 | 0 | Claude (orchestrator, secure-phase L1 grep verification on `main`, code at a7dc3e4) |

---

## Sign-Off

- [x] All threats have a disposition (mitigate / accept / transfer)
- [x] Accepted risks documented in Accepted Risks Log
- [x] `threats_open: 0` confirmed
- [x] `status: verified` set in frontmatter

**Approval:** verified 2026-09-27 — the production-step controls (T-12-25, T-12-26, T-12-27) were exercised when the founder ran plan 12-10 on 2026-09-27, before the phase merged.
