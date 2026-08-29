---
phase: 3
slug: volume-templates-verified-math
status: verified
# threats_open = count of OPEN threats at or above workflow.security_block_on severity (the blocking gate)
threats_open: 0
asvs_level: 1
created: 2026-08-28
---

# Phase 3 — Security

> Per-phase security contract: threat register, accepted risks, and audit trail.

---

## Trust Boundaries

| Boundary | Description | Data Crossing |
|----------|-------------|---------------|
| shaper's typed board name → PDF content stream | Free user text is measured, drawn into the printed name block, and shapes the download file name | user text (low sensitivity) |
| npm registry → build | Third-party dependency `jspdf` enters the dependency tree | third-party code |
| generated PDF / order form → physical printer & workshop | The artifact leaves the app and is trusted by a shaper cutting foam to it | board geometry |
| shaper's paper choice → layout computation | The paper-size picker crosses into geometry | enum input |
| client design state → downloaded file | The export dialog reads the open design and writes a file to the shaper's disk | own design data |
| GitHub Actions runner → repository contents | CI executes repository code on GitHub infrastructure, including fork pull requests | source code |
| workflow env block → build logs | Environment values declared in ci.yml are visible in logs | placeholders only |
| local branch → GitHub | Phase pushes commits to a remote where CI executes them | source code |

---

## Threat Register

| Threat ID | Category | Component | Severity | Disposition | Mitigation | Status |
|-----------|----------|-----------|----------|-------------|------------|--------|
| T-03-01 | Tampering | printed artifact scale (build-template-pdf.ts) | high | mitigate | jsPDF constructed with `unit: "mm"` (lines 638, 687); geometry mm passed through unconverted; 2in scale square ruler-verified at 100% print (UAT test 5 pass) | closed |
| T-03-02 | Tampering | templateFileName — user text in file name | low | mitigate | Slugified to `[a-z0-9-]` with `board-template.pdf` fallback (build-template-pdf.ts:748-755); overview export uses the same rule | closed |
| T-03-03 | Denial of Service | computeTemplateLayout page count | low | accept | Board dimensions clamped by BOARD_LENGTH_RANGE_IN / WIDEPOINT_WIDTH_RANGE_IN; grid bounded by construction | closed |
| T-03-04 | Information Disclosure | template export data source | low | accept | Export reads only the client's own design store; no new server surface | closed |
| T-03-SC | Tampering | npm install of `jspdf` (plans 01, 03) | high | mitigate | RESEARCH.md Package Legitimacy Audit: verdict OK (no postinstall, active, ~11 years, ~15M weekly downloads); jspdf@^4.2.1 the only new package this phase | closed |
| T-03-05 | Information Disclosure | ci.yml env block | high | mitigate | Zero `secrets.` references; only format-valid placeholders declared inline (verified by grep and a credential-free build reproduction) | closed |
| T-03-06 | Elevation of Privilege | workflow trigger surface | medium | mitigate | Triggers are `push` and `pull_request` only; `pull_request_target` absent | closed |
| T-03-07 | Tampering | CI as a correctness gate | medium | mitigate | `npm test` runs unconditionally; no `continue-on-error`, no test filter | closed |
| T-03-08 | Information Disclosure | build logs | low | accept | Logs may name file paths/routes of a private repository; no credential present | closed |
| T-03-09 | Tampering | name block rendering with arbitrary user text | low | mitigate | Text measured with `getTextWidth` against available width and truncated with ellipsis (build-template-pdf.ts:353); plain text content stream, no execution context | closed |
| T-03-10 | Tampering | mark / match-mark placement arithmetic | high | mitigate | Pure functions in lib/geometry/template.ts; markPlacements and matchMarkPositions suites green (995 tests), adjacent pages assert identical board-frame positions | closed |
| T-03-11 | Repudiation | printed artifact provenance | low | accept | Name + dims block records which board the pages belong to; stronger provenance not warranted for a workshop template | closed |
| T-03-12 | Tampering | paper-size input | low | mitigate | `PaperSize` is the closed union `"letter" \| "a4"` (template.ts:34) with a hard default | closed |
| T-03-13 | Information Disclosure | design data reaching the export | low | accept | Dialog reads only the browser's own store; no fetch, server action, or new API route | closed |
| T-03-14 | Denial of Service | repeated Download presses | low | mitigate | `generating` state disables the button and swaps its label during generation (export-preview-dialog.tsx:122,147) | closed |
| T-03-15 | Repudiation | silent export failure | medium | mitigate | Failure sets `error` state rendered inline (export-preview-dialog.tsx:280) and re-enables the button; dialog does not close as if succeeded | closed |
| T-03-16 | Tampering | design state integrity (toolbar toggles) | low | mitigate | showConstruction / wideView are local `useState`; zero design-store writes in outline-editor.tsx (grep: 0 mutator calls) | closed |
| T-03-17 | Denial of Service | wide-view layout | low | accept | Pure render change; same button restores; no unreachable state | closed |
| T-03-18 | Information Disclosure | none (toolbar) | low | accept | No new data read, fetched, or displayed | closed |
| T-03-19 | Tampering | printed order-form fidelity | medium | mitigate | Print overrides expressed as `color-mix` on the same base tokens (order-form.css:332-333); no literal colours; dark theme prints white (UAT test 4 pass) | closed |
| T-03-20 | Repudiation | an illegible printed spec | medium | mitigate | Human print check completed: both reference lines legible on paper (UAT test 4 pass) | closed |
| T-03-21 | Information Disclosure | printed board data | low | accept | Sheet prints only the design already open on the shaper's own screen | closed |
| T-03-22 | Elevation of Privilege | pushing to the deploying branch | high | mitigate | Phase work pushed to its working branch, never mid-phase to `main`; production deploys only from `main` (walkthrough executed per 03-07-SUMMARY) | closed |
| T-03-23 | Information Disclosure | CI run logs on GitHub | low | accept | Workflow carries only placeholders and reads no repository secret (verified in plan 02) | closed |
| T-03-24 | Tampering | a CI gate nobody has watched fail | medium | mitigate | Planned proof (walkthrough step 6: break an expectation, watch the run go red) was marked optional and no artifact records it was performed. Compensating: `npm test` runs unconditionally (T-03-07) and vitest fails the job on any red suite | open — below high threshold (non-blocking) |

*Status: open · closed · open — below high threshold (non-blocking)*
*Severity: critical > high > medium > low — only open threats at or above workflow.security_block_on (high) count toward threats_open*
*Disposition: mitigate (implementation required) · accept (documented risk) · transfer (third-party)*

---

## Accepted Risks Log

| Risk ID | Threat Ref | Rationale | Accepted By | Date |
|---------|------------|-----------|-------------|------|
| AR-03-1 | T-03-03 | Page-count grid bounded by construction (clamped dimensions, constant margins) | plan-time disposition, 03-01-PLAN | 2026-08-28 |
| AR-03-2 | T-03-04 | Export reads only the client's own design; no new access boundary | plan-time disposition, 03-01-PLAN | 2026-08-28 |
| AR-03-3 | T-03-08 | Private repo's own paths in build logs; no credential | plan-time disposition, 03-02-PLAN | 2026-08-28 |
| AR-03-4 | T-03-11 | Name/dims block is sufficient provenance for a workshop template | plan-time disposition, 03-03-PLAN | 2026-08-28 |
| AR-03-5 | T-03-13 | Dialog reads only the local store; no network surface | plan-time disposition, 03-04-PLAN | 2026-08-28 |
| AR-03-6 | T-03-17 | Sidebar collapse is pure render; always reversible | plan-time disposition, 03-05-PLAN | 2026-08-28 |
| AR-03-7 | T-03-18 | No new data surface from toolbar toggles | plan-time disposition, 03-05-PLAN | 2026-08-28 |
| AR-03-8 | T-03-21 | Order form prints only the shaper's own open design | plan-time disposition, 03-06-PLAN | 2026-08-28 |
| AR-03-9 | T-03-23 | CI logs expose placeholders and source layout only | plan-time disposition, 03-07-PLAN | 2026-08-28 |

*Accepted risks do not resurface in future audit runs.*

---

## Security Audit Trail

| Audit Date | Threats Total | Closed | Open | Run By |
|------------|---------------|--------|------|--------|
| 2026-08-28 | 25 | 24 | 1 (below block threshold) | Claude (gsd-secure-phase, ASVS L1 grep-depth audit) |

---

## Sign-Off

- [x] All threats have a disposition (mitigate / accept / transfer)
- [x] Accepted risks documented in Accepted Risks Log
- [x] `threats_open: 0` confirmed (T-03-24 open at medium, below the `high` block threshold)
- [x] `status: verified` set in frontmatter

**Approval:** verified 2026-08-28
