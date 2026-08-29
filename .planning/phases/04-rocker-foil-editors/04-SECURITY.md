---
phase: 04
slug: rocker-foil-editors
status: verified
# threats_open = count of OPEN threats at or above workflow.security_block_on severity (the blocking gate)
threats_open: 0
asvs_level: 1
created: 2026-08-29
---

# Phase 04 — Security

> Per-phase security contract: threat register, accepted risks, and audit trail.

---

## Trust Boundaries

| Boundary | Description | Data Crossing |
|----------|-------------|---------------|
| browser → `saveModel` Server Action | Design snapshot crosses from untrusted client state into Postgres; this phase widened the payload by rocker, foil, and the rails link flag | Shaper's own design values (low sensitivity) |
| stored JSON → `parseSnapshot` | Rows written by any past app version are read back into live design state (including into `summarizeDesign` for rack cards) | Persisted design snapshots |
| typed text → design state | First free-text numeric input in the app: a raw string becomes a stored millimetre value (imperial fields) | Shaper-typed measurements |
| pointer event → design state | A browser coordinate becomes a spec field through the drag solve | Pointer coordinates |
| design state → printed template / order form | Volume figure and rocker curve cross onto sheets a shaper cuts foam from | Derived design numbers |
| development-only code → production bundle | The preset-capture affordance reads live design values and must not ship | Dev-only tooling |

---

## Threat Register

| Threat ID | Category | Component | Severity | Disposition | Mitigation | Status |
|-----------|----------|-----------|----------|-------------|------------|--------|
| T-04-01 | Tampering | `lib/models/design-snapshot.ts` | low | mitigate | `rockerSpecSchema`/`foilSpecSchema` validate on every parse; malformed present value throws (unit test "a present-but-malformed rocker still throws") | closed |
| T-04-02 | Denial of Service | `lib/geometry/monotone-spline.ts` | low | mitigate | `Number.isFinite` guard (monotone-spline.ts:105) returns first point's y for non-finite x; unit-tested | closed |
| T-04-03 | Information Disclosure | `components/rocker/rocker-viewer.tsx` | low | accept | Renders only the shaper's own in-memory design; no string-built markup, no `dangerouslySetInnerHTML` | closed |
| T-04-04 | Tampering | `components/rocker/imperial-field.tsx` | low | mitigate | `parseImperial` returns null on unreadable input, field reverts with authored error; accepted values clamped and snapped to 1/16" before commit — verified live in UAT (banana reverted; 6'2 parsed then clamped to field max) | closed |
| T-04-05 | Tampering | `lib/geometry/rocker-drag.ts` | low | mitigate | Drag solve quantises and clamps into slider range (23 unit tests); UAT observed drag clamped at slider max | closed |
| T-04-06 | Denial of Service | `components/rocker/imperial-field.tsx` | low | mitigate | Non-finite/null parse falls back to last valid value; no NaN reaches the drawing | closed |
| T-04-07 | Information Disclosure | `components/rocker/rocker-datasheet.tsx` | low | accept | Table renders design values via `formatInchesFraction`; typed text echoed only inside fixed authored error sentence as React-escaped text | closed |
| T-04-08 | Tampering | `lib/models/design-snapshot.ts` | low | mitigate | `railsImportFoilThickness` validated `z.boolean()`; absence backfilled `true`, non-boolean throws (unit-tested round trip + backfill) | closed |
| T-04-09 | Repudiation | `lib/geometry/design.ts` | medium | mitigate | `computeRailBands` fed only `effectiveRails` (design-store.tsx:409-426); labels print the same derived value; three-station mapping pinned by unit tests; UAT confirmed foil→rails propagation and rocker-independence live | closed |
| T-04-10 | Elevation of Privilege | `saveModel` | low | accept | No new server surface; writes already scoped to the signed-in shaper's rows (Phase 2) | closed |
| T-04-11 | Repudiation | `lib/geometry/design.ts` / volume consumers | medium | mitigate | Single `deriveQuotedVolumeLitres` rule; grep confirms no consumer reads `volumeResult.volumeLitres` directly; UAT observed identical litres on Volume, Summary, and home card | closed |
| T-04-12 | Denial of Service | `lib/geometry/volume.ts` | low | mitigate | Fixed 51 stations (no unbounded iteration); zero half-width yields zero area; malformed sample array throws (volume.ts:421) instead of biasing silently | closed |
| T-04-13 | Tampering | `lib/geometry/volume.ts` | low | mitigate | Snapshots reaching `summarizeDesign` already passed `parseSnapshot` Zod validation; integrator treats values as plain numbers, no side effects | closed |
| T-04-14 | Information Disclosure | `components/rocker/rocker-editor.tsx` | low | mitigate | Capture affordance gated on `process.env.NODE_ENV === "development"` (rocker-editor.tsx:170) so the bundler strips it; Turbopack server source maps already disabled (Phase 1 fix) | closed |
| T-04-15 | Tampering | `components/summary/order-form.tsx` | low | accept | Renders only the shaper's own values as React-escaped text and numeric SVG attributes; no new external input | closed |
| T-04-16 | Denial of Service | `components/rocker/rocker-viewer.tsx` compact mode | low | accept | Fixed station count regardless of input; extreme specs change shape, not work done | closed |
| T-04-SC | Tampering | package-manager installs | low | accept | No packages installed anywhere in this phase; spline and Simpson's rule hand-written per CLAUDE.md Rule 1 | closed |

*Status: open · closed · open — below high threshold (non-blocking)*
*Severity: critical > high > medium > low — only open threats at or above workflow.security_block_on count toward threats_open*
*Disposition: mitigate (implementation required) · accept (documented risk) · transfer (third-party)*

---

## Accepted Risks Log

| Risk ID | Threat Ref | Rationale | Accepted By | Date |
|---------|------------|-----------|-------------|------|
| AR-04-01 | T-04-03 | Viewer draws only the shaper's own in-memory design with no injection surface | plan-time register (04-01) | 2026-08-29 |
| AR-04-02 | T-04-07 | Datasheet echoes typed text only inside a fixed, React-escaped error sentence | plan-time register (04-02) | 2026-08-29 |
| AR-04-03 | T-04-10 | No access-control change; `saveModel` scoping unchanged from Phase 2 | plan-time register (04-03) | 2026-08-29 |
| AR-04-04 | T-04-15 | Order form renders own design values only, React-escaped / numeric SVG | plan-time register (04-05) | 2026-08-29 |
| AR-04-05 | T-04-16 | Compact viewer samples fixed stations; no unbounded work | plan-time register (04-05) | 2026-08-29 |
| AR-04-06 | T-04-SC | No package installs in any plan of this phase | plan-time registers (all) | 2026-08-29 |

*Accepted risks do not resurface in future audit runs.*

---

## Security Audit Trail

| Audit Date | Threats Total | Closed | Open | Run By |
|------------|---------------|--------|------|--------|
| 2026-08-29 | 17 | 17 | 0 | gsd-secure-phase (L1 short-circuit: plan-time register, grep + UAT evidence) |

---

## Sign-Off

- [x] All threats have a disposition (mitigate / accept / transfer)
- [x] Accepted risks documented in Accepted Risks Log
- [x] `threats_open: 0` confirmed
- [x] `status: verified` set in frontmatter

**Approval:** verified 2026-08-29
