---
phase: quick-260914-rj0
slug: the-rear-fin-and-centre-fin-heights-on-t
status: verified
# threats_open = count of OPEN threats at or above workflow.security_block_on severity (the blocking gate)
threats_open: 0
asvs_level: 1
created: 2026-09-14
---

# Quick Task 260914-rj0 — Security

> Per-task security contract: threat register, accepted risks, and audit trail. The quick plan carried
> no `<threat_model>` block, so the register below was built retroactively from the task's own diff
> (`ce54605..6716979`: `components/fins/fin-label-layout.ts`, its test, `components/fins/fin-viewer.tsx`,
> `e2e/phone-fins-labels.spec.ts`) by gsd-security-auditor at ship time, then each entry was verified
> against the code rather than the prose.

---

## Trust Boundaries

| Boundary | Description | Data Crossing |
|----------|-------------|---------------|
| Persisted design → client render | Neon row → `lib/models/design-snapshot.ts` (zod) → design store → `computeFinPlacement` → `fin-viewer.tsx` labels. The only path by which non-app-authored data reaches the new code. zod enums plus `z.number()` guard it; `NaN` and `Infinity` are rejected by the installed zod 4.4.3 (verified with `safeParse`). | A shaper's own saved fin numbers (branded `Mm`), no secrets |
| App string → DOM | Formatter output becomes an SVG `<text>` child; `measure` / `role` become `data-*` attributes. React escaping is the control. | Label text and two closed-union attribute values |
| Test harness → local dev server | Playwright context ↔ `http://localhost:${PW_PORT}`, signed out. No boundary is newly crossed: the diff adds no network call, no storage write, no server code, no route, no Server Action, no auth check. | None |

---

## Threat Register

| Threat ID | Category | Component | Severity | Disposition | Mitigation | Status |
|-----------|----------|-----------|----------|-------------|------------|--------|
| T-QT-01 | Tampering (XSS via rendered label text) | `components/fins/fin-viewer.tsx` label pass | medium | mitigate | Text is formatter output on branded numeric values, rendered as a React child (auto-escaped); no raw-HTML sink | closed |
| T-QT-02 | Tampering (attribute injection via `data-fin-dim` / `data-fin-role`) | `fin-viewer.tsx` label pass | low | mitigate | Both values are closed compile-time unions set in code, never from input; React escapes attribute values | closed |
| T-QT-03 | Information disclosure (new DOM attributes) | `fin-viewer.tsx` label pass | low | mitigate | Attributes expose only what the label already prints on screen — no id, account, board name or secret | closed |
| T-QT-04 | Denial of service (algorithmic complexity in the new rule) | `components/fins/fin-label-layout.ts` passes | low | mitigate | Two bounded `for` loops, O(n²) with n = off-tail labels ≤ 3 (one per `FinRole`); no `while`, no recursion; `finSetup` is a zod enum so n cannot be inflated from storage | closed |
| T-QT-05 | Tampering (integrity of a shaping number — a label must stay on its own dimension line) | `fin-label-layout.ts` bounds and clamps | medium | mitigate | Per-label bounds from that label's own `lineTop` / `lineBottom`; both passes clamp; relaxation only ever widens toward the label's untouched `y`, so a label can never leave its own line except to stay where it started | closed |
| T-QT-06 | Tampering (state corruption across renders — compounding shifts) | `fin-viewer.tsx` adjusted-dims memo | medium | mitigate | `dims.slice()` + `{ ...original, labelY }` replaces the array slot; `marksWithDims` is never mutated, so re-renders cannot compound; idempotence is exercised by unit test 5 | closed |
| T-QT-07 | Spoofing (credential introduced by the new browser spec) | `e2e/phone-fins-labels.spec.ts` | high | mitigate | No `process.env`, Clerk or database reference and no absolute URL in the spec — only `page.goto("/")` against the config `baseURL`; `playwright.config.ts` is outside the diff and its placeholder values pre-date the task | closed |
| T-QT-08 | Supply chain (new dependency) | repo root | high | mitigate | `git diff --stat ce54605..6716979 -- package.json package-lock.json` is empty | closed |
| T-QT-09 | Elevation of privilege (auth or authorization boundary touched) | diff scope | high | mitigate | The one changed production file is a `"use client"` component; no route, middleware, Server Action, API handler, `drizzle/` or `lib/db/` file appears in the diff | closed |
| T-QT-10 | Denial of service (self-inflicted: extreme-but-finite persisted values) | `lib/models/design-snapshot.ts` → `fin-label-layout.ts` arithmetic | low | mitigate | No range validation at the persistence boundary: `z.number()` accepts `1e308`, and the new `predecessor.y + clearance` / width multiplication can then produce a non-finite `labelY`, dropping a height number off the drawing. The weak control pre-dates this diff and designs are per-account with no public sharing, so the blast radius is the shaper's own drawing. Expected mitigation: a finite, plausible-range bound on the fin override numbers, or a `Number.isFinite` guard on the computed baseline. | open — below high threshold (non-blocking) |

*Status: open · closed · open — below high threshold (non-blocking)*
*Severity: critical > high > medium > low — only open threats at or above workflow.security_block_on count toward threats_open*
*Disposition: mitigate (implementation required) · accept (documented risk) · transfer (third-party)*

---

## Accepted Risks Log

| Risk ID | Threat Ref | Rationale | Accepted By | Date |
|---------|------------|-----------|-------------|------|

No accepted risks. T-QT-10 is left open and non-blocking rather than accepted on the shaper's behalf; it can be closed by a range bound at the persistence boundary or accepted here by the shaper.

---

## Security Audit Trail

| Audit Date | Threats Total | Closed | Open | Run By |
|------------|---------------|--------|------|--------|
| 2026-09-14 | 10 | 9 | 1 (below high threshold, non-blocking) | gsd-security-auditor (opus), dispatched by /gsd-ship |

---

## Sign-Off

- [x] All threats have a disposition (mitigate / accept / transfer)
- [x] Accepted risks documented in Accepted Risks Log (none)
- [x] `threats_open: 0` confirmed
- [x] `status: verified` set in frontmatter

**Approval:** verified 2026-09-14
