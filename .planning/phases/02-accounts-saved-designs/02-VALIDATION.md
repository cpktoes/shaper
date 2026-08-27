---
phase: 2
slug: accounts-saved-designs
# status lifecycle: draft (seeded by plan-phase) → validated (set by validate-phase §6)
# audit-milestone §5.5 distinguishes NOT-VALIDATED (draft) from PARTIAL (validated + nyquist_compliant: false) (#2117)
status: draft
nyquist_compliant: false
wave_0_complete: false
created: 2026-08-27
---

# Phase 2 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | vitest (installed, `lib/**/*.test.ts`, node environment) |
| **Config file** | vitest.config.ts |
| **Quick run command** | `npm test` |
| **Full suite command** | `npm test && npm run lint && npm run build` |
| **Estimated runtime** | ~60 seconds |

---

## Sampling Rate

- **After every task commit:** Run `npm test`
- **After every plan wave:** Run `npm test && npm run lint && npm run build`
- **Before `/gsd-verify-work`:** Full suite must be green
- **Max feedback latency:** 90 seconds

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Threat Ref | Secure Behavior | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|------------|-----------------|-----------|-------------------|-------------|--------|
| — | — | — | — | — | To be filled by planner from PLAN.md tasks | — | — | ❌ W0 | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

- [ ] `lib/models/serialization.test.ts` — stubs for MODL-01/MODL-02 snapshot round-trip
- [ ] Ownership-scoping unit coverage for server-action helpers (ACCT/MODL security behavior)

*Existing vitest infrastructure covers geometry suites; persistence helpers need new test files.*

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| Sign up, log in, session persists across browser restarts | ACCT-01, ACCT-02 | Clerk-hosted flow + real browser session | Sign up in browser, close/reopen, confirm still signed in |
| Password reset via emailed link | ACCT-03 | Requires real email delivery | Trigger reset, follow emailed link, set new password |
| Save, reopen, and list models against live Neon DB | MODL-01..03 | Requires provisioned Neon + Clerk env vars | Save named board, reload, reopen from rack, confirm exact restore |

---

## Validation Sign-Off

- [ ] All tasks have `<automated>` verify or Wave 0 dependencies
- [ ] Sampling continuity: no 3 consecutive tasks without automated verify
- [ ] Wave 0 covers all MISSING references
- [ ] No watch-mode flags
- [ ] Feedback latency < 90s
- [ ] `nyquist_compliant: true` set in frontmatter

**Approval:** pending
