---
phase: 9
slug: the-design-screens-on-a-phone
status: verified
# threats_open = count of OPEN threats at or above workflow.security_block_on severity (the blocking gate)
threats_open: 0
asvs_level: 1
block_on: high
created: 2026-09-09
verified: 2026-09-09
---

# Phase 9 — Security

> Per-phase security contract: threat register, accepted risks, and audit trail.

State when this pass ran: no SECURITY.md existed; the register below was assembled from the nine
plans' own `<threat_model>` blocks (44 rows, authored at plan time) and verified against `main` at
`7ec7b8a` by the security auditor on 2026-09-09. Two low-severity rows (T-09-17, T-09-24) were open
because a promised unit test had never been written; the orchestrator added that test in the same
pass, and they are closed on it. Three items that appeared after the register was written are
recorded as T-09-36…38 so the register stays complete.

---

## Trust Boundaries

| Boundary | Description | Data Crossing |
|----------|-------------|---------------|
| Browser suite → dev server | `playwright.config.ts` starts the app with deliberately fake, non-key-shaped Clerk keys and a localhost database URL so the suite never needs a real credential | fake credentials only; no `.env*` is tracked |
| Production-build suite → `next start` | `playwright.prod.config.ts` lets `next start` load the machine's own `.env.local` (development Clerk instance, development Neon branch); local-only, never CI | development credentials read from disk, none committed |
| Test code (`e2e/`) → app bundle | CDP touch and print-stub code lives under `e2e/` and is never imported by `app/`, `components/` or `lib/` | none at runtime |
| Screen presentation → printed page | Phone-only rules are `max-shell:` / `coarse:` gated and the print stylesheets are untouched; `data-print-hide` keeps every phone bar and note off paper | the shaper's design values, formatted through `lib/geometry/units.ts` |
| The element the browser focuses → the element the app rings | Focus rings key on `:has(:focus-visible)` / `:focus-visible` on the truly focused element, never on a second idea of focus | none |
| The finger's position → the board's spec | Drag solvers take board millimetres only; readout cards read the live spec, never the pointer; NaN touches pick nothing | board values, clamped by `OUTLINE_DRAG_LIMITS` |
| iOS launch context → what the dialog offers | The Home-Screen print note is gated in CSS on width + iOS (`-webkit-touch-callout`) + `display-mode: standalone`; `window.print()` is unchanged | none |

---

## Threat Register

| Threat ID | Category | Component | Severity | Disposition | Mitigation | Status |
|-----------|----------|-----------|----------|-------------|------------|--------|
| T-09-SC (09-01) | Tampering | npm install of Playwright | high | mitigate | devDependency only, lockfile committed in the same commit (`4121b5b`); SUS verdict in 09-01-SUMMARY | closed |
| T-09-01 | Information Disclosure | e2e fake credentials | medium | mitigate | `playwright.config.ts:40-45`: example Clerk key, non-key-shaped secret, localhost DB; `.env*` ignored; repo-wide credential-shape scan clean | closed |
| T-09-02 | Tampering | test code reaching the app | medium | mitigate | no `@playwright/test` import under app/components/lib; vitest globs limited to lib/components | closed |
| T-09-03 | Denial of Service | shared dev-server port | low | accept | port 3100 + `reuseExistingServer`, `PW_PORT` per worktree | closed |
| T-09-04 | Tampering | `DesignScreenShell` | low | accept | layout-only component, reads no board value | closed |
| T-09-05 | Denial of Service | dvh height chain | low | accept | CSS-only, nothing written on resize | closed |
| T-09-06 | Information Disclosure | phone menu | low | accept | renders `NavAuthControl` propless; no session read | closed |
| T-09-07 | Tampering | phone switches drifting into the desktop | medium | mitigate | additive `coarse` / `--breakpoint-shell` variants; five desktop baselines + `desktop-regression.spec.ts` | closed |
| T-09-08 | Tampering | rocker view frame | low | accept | file untouched by phase 9 | closed |
| T-09-09 | Tampering | modals outside the shell columns | medium | mitigate | `outsideColumns` in the shell; FINS toe table passed through it | closed |
| T-09-10 | Denial of Service | rocker pinned-height fallback | low | mitigate | fallback not taken, recorded in 09-03-SUMMARY | closed |
| T-09-11 | Tampering | rails print path from phone rules | high | mitigate | `max-shell:hidden print:*` pairs; `actual-size.css` untouched; 09-04 commits are `.tsx` only | closed |
| T-09-12 | Tampering | phone bars on paper | medium | mitigate | `printHide` → `data-print-hide` on the shell, set by the rails editor | closed |
| T-09-13 | Information Disclosure | data sheet values on a phone | medium | mitigate | scroll box + fade only; no value formatting touched; `units-isolation.test.ts` green | closed |
| T-09-14 | Tampering | touch sizing leaking into print | medium | mitigate | `coarse:min-h-11 print:min-h-0`; order form carries no `coarse:` | closed |
| T-09-15 | Denial of Service | cosmetic drift | low | accept | desktop baselines catch it | closed |
| T-09-16 | Tampering | viewport zoom lock | medium | mitigate | no `maximumScale`/`userScalable` in `app/layout.tsx`; prohibition recorded | closed |
| T-09-17 | Tampering | NaN touch coordinate reaching the pick | low | mitigate | strict `<`/`<=` comparisons fail on NaN; now tested in both pickers (`outline-drag.test.ts`, `rocker-drag.test.ts`, added 2026-09-09) | closed |
| T-09-18 | Tampering | drag limits | low | accept | `OUTLINE_DRAG_LIMITS` unedited | closed |
| T-09-19 | Repudiation | hit radius measured at phone sizes | medium | mitigate | `drag-spacing.test.ts:259-268` asserts the 18–22px band | closed |
| T-09-20 | Tampering | client-only editor | low | accept | solver clamps unchanged | closed |
| T-09-21 | Information Disclosure | markup injection in viewers | medium | mitigate | no raw-HTML sink; `drag-readout-chip.test.ts` asserts no `dangerouslySetInnerHTML` | closed |
| T-09-22 | Tampering | readout card showing a stale value | medium | mitigate | card composed from the live spec, cleared on cancel (`outline-viewer.tsx`); a saturated-clamp e2e was planned but not written — recorded as an assurance gap, value is unreachable-stale by construction | closed |
| T-09-23 | Tampering | CDP test code in the bundle | medium | mitigate | CDP confined to `e2e/`; no Playwright import under app/components/lib | closed |
| T-09-24 | Denial of Service | NaN distance in the pick | low | mitigate | same test as T-09-17 (added 2026-09-09) | closed |
| T-09-25 | Spoofing | focus ring vs the truly focused control | medium | mitigate | `:has(:focus-visible)` / `:focus-visible` rules; `keyboard-focus.spec.ts` reads the ring off `document.activeElement` | closed |
| T-09-26 | Tampering | focus treatment drifting into copies | medium | mitigate | one rule each; 13 `focus-ring-accent` sites; rationale in `globals.css` | closed |
| T-09-27 | Information Disclosure | new markup from the focus change | low | accept | pure class-string edits, no new markup | closed |
| T-09-28 | Denial of Service | focus lost in forced-colors mode | medium | mitigate | transparent 2px outline + offset on both rules | closed |
| T-09-29 | Tampering | focus-only change altering rest/hover | high | mitigate | `slider.tsx` untouched by 09-08; five baselines current; `touch-sizing.spec.ts` re-measures 59.5/65/69 | closed |
| T-09-30 | Spoofing | a Print button that cannot print | high | mitigate | button hidden and note shown only under width + iOS + standalone; proved by the compiled-CSS contract test (`view-full-sized-dialog.css.test.ts`) and the sentence/CSS-only contract, replacing the plan's un-runnable CDP case | closed |
| T-09-31 | Tampering | the swap leaking to desktop or paper | high | mitigate | `max-shell:` on every chain; `DialogFooter data-print-hide`; desktop e2e; five baselines | closed |
| T-09-32 | Tampering | print path altered | high | mitigate | 09-09 touched only the dialog, its tests and `phone-rails.spec.ts`; `window.print()` call site unchanged | closed |
| T-09-33 | Information Disclosure | injection through the note | low | mitigate | fixed JSX string; wording pinned by test | closed |
| T-09-34 | Repudiation | a silent print failure shipping again | high | mitigate | print-stub `expect.poll(...).toBe(1)` on iphone and android; on-device check recorded in 09-UAT (item 6, pending the founder) | closed |
| T-09-35 | Tampering | test-only CDP reaching the bundle | medium | mitigate | no CDP call remains in `phone-rails.spec.ts`; `e2e/` isolation verified | closed |
| T-09-SC (09-02…09-09) | Tampering | npm installs | high | mitigate | `package.json` untouched by every plan commit; later changes are a script and a rename only | closed |
| T-09-36 | Information Disclosure | `playwright.prod.config.ts` reading the machine's `.env.local` | medium | mitigate | added after the register (quick 260909-nvw / 4343385); nothing secret committed, `.env*` ignored, local-only and never CI; documented in the config's own comment | closed |
| T-09-37 | Tampering | a second CDP call site (`e2e/slider-touch.spec.ts`) | medium | mitigate | added by quick 260909-kyz; lives under `e2e/`, the same isolation as T-09-23/T-09-35 (no Playwright import under app/components/lib) | closed |
| T-09-38 | Tampering | removal of the Fine adjust fold (`fine-adjust-group.tsx` deleted) | low | accept | quick 260909-oho reverting D-03 at the founder's request; no new surface, one fewer focus-ring site | closed |

*Status: open · closed · open — below high threshold (non-blocking)*
*Severity: critical > high > medium > low — only open threats at or above workflow.security_block_on count toward threats_open*
*Disposition: mitigate (implementation required) · accept (documented risk) · transfer (third-party)*

---

## Accepted Risks Log

| Risk ID | Threat Ref | Rationale | Accepted By | Date |
|---------|------------|-----------|-------------|------|
| R-09-01 | T-09-03, T-09-04, T-09-05, T-09-06, T-09-08, T-09-15, T-09-18, T-09-20, T-09-27 | Each plan's own register accepted these at plan time: layout-only components that read no board value, CSS-only height chains, an untouched file, cosmetic drift the baselines catch, unchanged limits, pure class edits | planner (per plan), confirmed by the 2026-09-09 audit | 2026-09-09 |
| R-09-02 | T-09-38 | The Fine adjust fold was removed at the founder's request; the change removes surface rather than adding it | founder (2026-09-09), recorded here | 2026-09-09 |

*Accepted risks do not resurface in future audit runs.*

---

## Security Audit Trail

| Audit Date | Threats Total | Closed | Open | Run By |
|------------|---------------|--------|------|--------|
| 2026-09-09 | 47 (44 registered + 3 recorded post-register) | 47 | 0 | gsd-security-auditor (opus) + orchestrator (NaN test added, T-09-36…38 recorded) |

Assurance gap worth carrying, not a threat: T-09-22's saturated-clamp e2e case was never written; the readout card renders post-solver state directly, so a stale value is unreachable by construction. On-device checks still owed to the founder are tracked in 09-UAT.md, not here.

---

## Sign-Off

- [x] All threats have a disposition (mitigate / accept / transfer)
- [x] Accepted risks documented in Accepted Risks Log
- [x] `threats_open: 0` confirmed
- [x] `status: verified` set in frontmatter

**Approval:** verified 2026-09-09
