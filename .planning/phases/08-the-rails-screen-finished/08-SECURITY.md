---
phase: 08
slug: the-rails-screen-finished
status: verified
# threats_open = count of OPEN threats at or above workflow.security_block_on severity (the blocking gate)
threats_open: 0
asvs_level: 1
created: 2026-09-08
---

# Phase 08 — Security

> Per-phase security contract: threat register, accepted risks, and audit trail.

Register origin: authored at plan time — all nine PLAN.md files (08-01 … 08-09, the last three being
the UAT gap-closure plans) carry a `<threat_model>` block. No SUMMARY.md raised a threat flag.
Verification depth: ASVS L1 (grep-level presence of each mitigation in the implementation on `main`
at `aba3886`, plus the phase's own measured evidence), by the execute-phase orchestrator on
2026-09-08. Block threshold: high.

---

## Trust Boundaries

| Boundary | Description | Data Crossing |
|----------|-------------|---------------|
| prototype source → fixture JSON | `Rails.dc.html` executed by `new Function` inside a developer-run extraction script, never at runtime | repo-local prototype source, no shaper data |
| design store → rails screen / SVG render / dialog | already-trusted in-process board state becoming drawn geometry and text | the shaper's own board dimensions |
| browser → server action | a client component calls `savePrintRailInstructionsPreference` with an untrusted argument | one boolean preference |
| cookie / localStorage → render | a shaper-editable value reaches a conditional render, the printed sheet count and, via promotion, the database | `shaper-print-rail-instructions` string |
| server action → Postgres | an upsert keyed by the Clerk user id | preference row per account |
| repo static asset → browser | `public/rail-bands-plan-bg.png` served to every visitor | a generic teaching illustration, no shaper data |
| DOM measurement → drawing size | a probe element's measured width sets the actual-size drawing | a pixels-per-inch number |
| shaper's browser → printer | the browser's own print pipeline: the View Full Sized page, the order form, the instructions sheet | the shaper's own board data, printed locally |
| pre-phase commit → scratch worktree | historical repository content re-executed locally for byte-identity comparison (08-06) | build output only |
| local checkout → production database | the one production write in the phase: the `print_rail_instructions` column migration (08-06) | schema change; transient env file |

---

## Threat Register

| Threat ID | Category | Component | Severity | Disposition | Mitigation | Status |
|-----------|----------|-----------|----------|-------------|------------|--------|
| T-08-01 | Tampering | `scripts/extract-prototype-rails-golden.mjs` (`new Function` over prototype source) | low | accept | Developer-run only (`npm run golden:rails`), never bundled or served; reads a repo-local file — AR-01 | closed |
| T-08-02 | Information Disclosure | `components/rails/rail-instructions.tsx` | low | accept | Fixed literal inputs, no shaper data, nothing fetched or sent — AR-02 | closed |
| T-08-03 | Tampering | `RailSectionPlot` `callouts` prop | low | mitigate | Internal typed array built by `buildRailCallouts` from the plot's own output (`rail-instructions.tsx:97`); no string from storage, cookie or network reaches it | closed |
| T-08-04 | Tampering | cookie + localStorage value `shaper-print-rail-instructions` | medium | mitigate | Every read goes through the `parsePrintRailInstructionsPreference` allow-list (`print-instructions-provider.tsx:58`, `print-instructions-server.ts:27`, `print-instructions-preference.ts:68`); anything outside `"true"`/`"false"` is `null` | closed |
| T-08-05 | Elevation of Privilege | `app/actions/print-instructions.ts` | high | mitigate | Identity only from `await auth()` (line 25); the exported action takes a single boolean and no user id (line 24); no session → early return | closed |
| T-08-06 | Tampering | the `onConflictDoUpdate` upsert | high | mitigate | `typeof value !== "boolean"` guard (line 28) runs before any database statement, mirroring `saveUnitsPreference` | closed |
| T-08-07 | Denial of Service | the background account write | low | accept | Bounded three-rung retry ladder, one write in flight (`lib/preference-handoff.ts:64`) — AR-03 | closed |
| T-08-08 | Repudiation | exhausted write retries | low | accept | Logs once for an operator, silent for the shaper (Phase 5 D-11) — AR-04 | closed |
| T-08-09 | Information Disclosure | `public/rail-bands-plan-bg.png` | low | accept | Generic teaching illustration already public in the prototype archive — AR-05 | closed |
| T-08-10 | Tampering | ported `d=` path strings rendered into SVG | low | mitigate | Module constants pinned against the prototype by `components/rails/rail-reference-paths.test.ts`; no runtime input | closed |
| T-08-11 | Denial of Service | the reference figure's raster failing to load | low | mitigate | The box reserves the artwork's aspect ratio (`rail-plan-side-figure.tsx:151`); overlays, side strip and labels render independently | closed |
| T-08-12 | Tampering | the measured pixels-per-inch probe | medium | mitigate | Non-positive or absent measurement falls back to the CSS value (`view-full-sized-dialog.tsx:62`, `px > 0 ? px : 96`) | closed |
| T-08-13 | Spoofing | the actual-size claim itself | medium | mitigate | The 2 in / 50.8 mm check bar is drawn from the same `pxPerInch` as the rail (`view-full-sized-dialog.tsx:179–185`) beside the fixed caveat sentence; UAT test 4 measured it true on screen, and the printed page measured 143.99 pt (2 in) after gap G-08-5 closed | closed |
| T-08-14 | Information Disclosure | the printed View Full Sized page | low | accept | The shaper's own rail geometry on their own printer — AR-06 | closed |
| T-08-15 | Tampering | the `@media print` stylesheet `app/design/rails/actual-size.css` | low | mitigate | Imported only by `app/design/rails/page.tsx`; the order form and the three jsPDF outputs are untouched (T-08-19) | closed |
| T-08-16 | Tampering | the preference value reaching the sheet count | medium | mitigate | Read only through `usePrintRailInstructions()`, whose store parses every cookie and localStorage read through the allow-list (T-08-04) | closed |
| T-08-17 | Tampering | the third sheet's content | medium | mitigate | `RailInstructionsSheet()` takes no props and holds no state; fixed to the non-domed rail and `ALL_RAIL_REFERENCE_GROUPS` (`rail-instructions-sheet.tsx:8–49`) | closed |
| T-08-18 | Information Disclosure | the printed order form | low | accept | The shaper's own board spec, unchanged in kind — AR-07 | closed |
| T-08-19 | Tampering | the frozen page-2 layout and the three jsPDF outputs | high | mitigate | `components/template/` has no diff across the whole phase (`git diff 71f17db..HEAD -- components/template/` empty); 08-06 rebuilt the jsPDF outputs byte-identical; UAT test 7 passed the order form | closed |
| T-08-20 | Tampering | the production schema migration | high | mitigate | Ordering enforced as a blocking human action: code pushed and deployed first, `npm run db:migrate:prod` after; UAT test 8 confirmed the `print_rail_instructions` column exists in production | closed |
| T-08-21 | Denial of Service | the live site between push and migration | medium | mitigate | The account read is wrapped in try/catch and degrades to the cookie (`print-instructions-server.ts:8`); the write is fire-and-forget through the bounded queue | closed |
| T-08-22 | Information Disclosure | the transient production env file | high | mitigate | `db:migrate:prod` (package.json) pulls `.env.production.pull` under `trap 'rm -f …' EXIT INT TERM`; no agent creates, copies or edits any `.env*` | closed |
| T-08-23 | Tampering | the throwaway probe test files | low | mitigate | No `components/zz-*` probe survives; `git status --porcelain` clean at close | closed |
| T-08-P1 | Information Disclosure | `components/auth/sign-in-banner.tsx` | low | mitigate | `data-print-hide` on the banner; measured absent from the printed View Full Sized page and the printed order form | closed |
| T-08-P2 | Tampering | `@page` rule emitted from a mounted component | medium | mitigate | Plain style element with no `href` or precedence prop, so React 19 cannot hoist it (`view-full-sized-dialog.tsx:147–161`); test pins it; a closed-dialog print measured portrait after client-side navigation | closed |
| T-08-P3 | Denial of Service | print path | low | accept | Worst case is wasted paper; the check bar and the PDF measurement catch a mis-shaped print — AR-08 | closed |
| T-08-A1 | Tampering | `buildRailPlotGrid` label options | medium | mitigate | Options default to today's behaviour and the Imperial branch ignores them; tests assert Imperial output identical with and without (`rail-section-plot.test.ts`) | closed |
| T-08-A2 | Information Disclosure | axis labels | low | accept | The shaper's own dimensions already on screen; thinning shows strictly less — AR-09 | closed |
| T-08-A3 | Repudiation | printed instructions sheet | low | mitigate | The three-scale fit tests (`railPlotTicksFit`, `railPlotLeftLabelsFit`, `railPlotStackedLabelsFit`) pin the printed sheet's labels | closed |
| T-08-O1 | Tampering | `app/design/summary/order-form.css` print block | medium | mitigate | Edit confined to `@media print`; `order-form-print.test.ts` pins the padding reset (read from the stylesheet) and the `@page` margin mirror | closed |
| T-08-O2 | Information Disclosure | printed order form | low | accept | The shaper's own board spec; the change removes blank paper — AR-10 | closed |
| T-08-O3 | Denial of Service | print path | low | accept | Worst case is wasted paper, the condition being fixed — AR-11 | closed |
| T-08-SC | Tampering | npm/pip/cargo installs (declared in all nine plans) | high | accept (08-01…05) / mitigate (08-06…09) | Zero packages installed: no dependency line in `package.json` changed and `package-lock.json` is untouched across the phase (`71f17db..HEAD`); 08-06 forbade installing Puppeteer/Playwright to rescue its diff — AR-12 | closed |

*Status: open · closed · open — below high threshold (non-blocking)*
*Severity: critical > high > medium > low — only open threats at or above workflow.security_block_on count toward threats_open*
*Disposition: mitigate (implementation required) · accept (documented risk) · transfer (third-party)*

---

## Accepted Risks Log

| Risk ID | Threat Ref | Rationale | Accepted By | Date |
|---------|------------|-----------|-------------|------|
| AR-01 | T-08-01 | The golden-extraction script runs `new Function` over a repo-local prototype file on a developer's machine only; it is never bundled, served or run in CI against untrusted input | planner (08-01 threat model); confirmed by orchestrator | 2026-09-08 |
| AR-02 | T-08-02 | The INSTRUCTIONS tab renders fixed literal inputs; nothing is fetched and nothing is sent | planner (08-01); confirmed by orchestrator | 2026-09-08 |
| AR-03 | T-08-07 | The background account write retries on a bounded three-rung ladder with one write in flight, so a failing database is never hammered | planner (08-02); confirmed by orchestrator | 2026-09-08 |
| AR-04 | T-08-08 | An exhausted write ladder logs once for an operator and stays silent for the shaper, matching the units path (Phase 5 D-11) | planner (08-02); confirmed by orchestrator | 2026-09-08 |
| AR-05 | T-08-09 | The plan-view background is a generic teaching illustration already public in the prototype archive; it carries no shaper data | planner (08-03); confirmed by orchestrator | 2026-09-08 |
| AR-06 | T-08-14 | The printed View Full Sized page carries the shaper's own rail geometry, printed by their own browser on their own machine | planner (08-04); confirmed by orchestrator | 2026-09-08 |
| AR-07 | T-08-18 | The printed order form carries the shaper's own board data, unchanged in kind from the two pages already printed | planner (08-05); confirmed by orchestrator | 2026-09-08 |
| AR-08 | T-08-P3 | A mis-shaped print wastes paper; there is no service to deny, and the check bar plus the PDF measurement catch it first | planner (08-07); confirmed by orchestrator | 2026-09-08 |
| AR-09 | T-08-A2 | Axis numbers are the shaper's own dimensions, already on screen; thinning them shows strictly less | planner (08-08); confirmed by orchestrator | 2026-09-08 |
| AR-10 | T-08-O2 | The printed order form is the point of printing it; the change removes blank paper and adds nothing | planner (08-09); confirmed by orchestrator | 2026-09-08 |
| AR-11 | T-08-O3 | Worst case is wasted paper, which is the condition being fixed | planner (08-09); confirmed by orchestrator | 2026-09-08 |
| AR-12 | T-08-SC | The phase installs zero packages, so no package-legitimacy gate applies; verified by the empty dependency diff across `71f17db..HEAD` | planner (08-01…05, accept); 08-06…09 mitigate; confirmed by orchestrator | 2026-09-08 |

*Accepted risks do not resurface in future audit runs.*

---

## Security Audit Trail

| Audit Date | Threats Total | Closed | Open | Run By |
|------------|---------------|--------|------|--------|
| 2026-09-08 | 33 | 33 | 0 | execute-phase orchestrator (Claude), ASVS L1 grep verification on `main` at `aba3886` |

---

## Sign-Off

- [x] All threats have a disposition (mitigate / accept / transfer)
- [x] Accepted risks documented in Accepted Risks Log
- [x] `threats_open: 0` confirmed
- [x] `status: verified` set in frontmatter

**Approval:** verified 2026-09-08
