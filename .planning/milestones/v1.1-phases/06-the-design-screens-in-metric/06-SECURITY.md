---
phase: 06
slug: the-design-screens-in-metric
status: verified
# threats_open = count of OPEN threats at or above workflow.security_block_on severity (the blocking gate)
threats_open: 0
asvs_level: 1
created: 2026-09-05
---

# Phase 06 — Security

> Per-phase security contract: threat register, accepted risks, and audit trail.

---

## Trust Boundaries

| Boundary | Description | Data Crossing |
|----------|-------------|---------------|
| units preference → every design-screen number | The shaper's Imperial/Metric choice decides how a stored millimetre is printed and typed; a value printed in the wrong family is off by a factor of ten and a shaper cuts foam to it | display strings only — storage stays metric (Mm) |
| typed field → design store | A typed value is parsed, clamped and snapped before it can reach the store; an unreadable value must never be stored | Mm written to the design store |
| geometry model → the fin surfaces | One family tag in lib/geometry/fins.ts drives the DATA tab while the sidebar and drawing choose their own formatter | fin placement numbers |
| Imperial output → the pre-phase app | Every Imperial string must stay byte-identical to what shipped before Phase 6 | formatted strings |

---

## Threat Register

Threat IDs repeat across plans, so each row is qualified by its plan.

| Threat ID | Category | Component | Severity | Disposition | Mitigation | Status |
|-----------|----------|-----------|----------|-------------|------------|--------|
| 06-01 / T-06-01 | Tampering | `commitTypedMeasure` / `MeasureField` (Plan 02) | medium | mitigate | A typed string never becomes state: `parseMetric`/`parseImperial` return null on anything unreadable, and only a non-null parse is… | closed |
| 06-01 / T-06-02 | Tampering | `lib/geometry/measure-display.ts`, every converted display site | high | mitigate | A saved board silently changing is the worst outcome this app has. Every function in the display boundary takes its value and returns a… | closed |
| 06-01 / T-06-03 | Tampering | `metricSliderRange` | medium | mitigate | A metric bound rounded the wrong way would let a metric drag store a value outside the imperial range, so a later imperial nudge would… | closed |
| 06-01 / T-06-SC | Tampering | npm/pip/cargo installs | low | accept | No package is installed by this phase — RESEARCH.md confirms zero new dependencies and the UI-SPEC's Registry Safety section confirms… | closed |
| 06-02 / T-06-01 | Tampering | `MeasureField`, `commitTypedMeasure` | medium | mitigate | The raw typed string never becomes state: `MeasureField` holds it in local component state only and calls `onCommit` solely when… | closed |
| 06-02 / T-06-02 | Tampering | the three Board Length controls | high | mitigate | A commit writes the stored millimetre and nothing else; the units preference is a render-time argument only, never persisted with the… | closed |
| 06-02 / T-06-SC | Tampering | npm/pip/cargo installs | low | accept | No package is installed by this plan — `MeasureField` is built on the already-vendored `components/ui/input.tsx`, and the UI-SPEC's… | closed |
| 06-03 / T-06-01 | Tampering | the datasheet's seven `MeasureField` cells | medium | mitigate | Each cell passes its own `measureSlider`-derived bounds to `MeasureField`, so a commit is clamped to the same range the matching sidebar… | closed |
| 06-03 / T-06-02 | Tampering | `rocker-datasheet.tsx`, `rocker-viewer.tsx`, `rocker-controls.tsx` | high | mitigate | These files render strings and commit explicit user edits only; the ledger in `lib/units-isolation.test.ts` fails the suite if any of… | closed |
| 06-03 / T-06-04 | Tampering | `stationLabel`, `MEASURE_STATION_MM` | high | mitigate | Moving the station would silently change every rail band, rocker and volume number a shaper has already cut to. The station constant is… | closed |
| 06-03 / T-06-SC | Tampering | npm/pip/cargo installs | low | accept | No package is installed by this plan. | closed |
| 06-04 / T-06-02 | Tampering | `rail-controls.tsx`, `rail-data-table.tsx`, `rail-section-plot.tsx` | high | mitigate | The model-side snaps inside `computeRailBands` are not touched, so the numbers themselves cannot move;… | closed |
| 06-04 / T-06-05 | Tampering | the rail plot's grid loop | medium | mitigate | A wrong metric grid pitch would have a shaper counting squares that do not match the marks. The new `rail-section-plot.test.ts` pins… | closed |
| 06-04 / T-06-SC | Tampering | npm/pip/cargo installs | low | accept | No package is installed by this plan. | closed |
| 06-05 / T-06-06 | Tampering | `FinSummaryRow.family`, `fin-data-panel.tsx` | high | mitigate | A toe-in printed as centimetres instead of millimetres reads ten times too large and a shaper would drill to it. The family is tagged… | closed |
| 06-05 / T-06-02 | Tampering | `toeAimTableFor`, both fins data components | high | mitigate | The placement and table-selection arithmetic is untouched and the existing `lib/geometry/fins.test.ts` cases stay green unedited; the… | closed |
| 06-05 / T-06-SC | Tampering | npm/pip/cargo installs | low | accept | No package is installed by this plan. | closed |
| 06-06 / T-06-01 | Tampering | `BaseLengthField`, the quad rear off-tail override box | medium | mitigate | Both boxes keep today's clamp-on-change behaviour, now driven by `measureSlider`'s bounds so the box and its matching slider can never… | closed |
| 06-06 / T-06-06 | Tampering | every FINS label and callout | high | mitigate | Family classification is explicit per control (`formatDim` for distances up the board, `formatMark` for toe and off-rail) and follows… | closed |
| 06-06 / T-06-02 | Tampering | `fin-controls.tsx`, `fin-viewer.tsx` | high | mitigate | The placement math is untouched (`lib/geometry/fins.test.ts` green unedited) and the ledger fails the suite if either file formats a… | closed |
| 06-06 / T-06-SC | Tampering | npm/pip/cargo installs | low | accept | No package is installed by this plan. | closed |
| 06-07 / T-06-02 | Tampering | `volume-calculation-card.tsx`, `volume-estimator.tsx`, `volume-controls.tsx` | high | mitigate | The volume math is untouched — `lib/geometry/volume.test.ts` stays green unedited — and the litres rendering takes no system argument at… | closed |
| 06-07 / T-06-07 | Tampering | `formatArea`, `formatCubicVolume` | medium | mitigate | An area or volume converted with a restated factor could disagree with the `area` field the outline model computes. Both conversions… | closed |
| 06-07 / T-06-08 | Information disclosure | the Summary order form | low | accept | The part-converted Summary shows metric in the shared components and inches elsewhere until Phase 7. This is a legibility inconsistency… | closed |
| 06-07 / T-06-SC | Tampering | npm/pip/cargo installs | low | accept | No package is installed by this phase — zero new dependencies and zero new `components/ui/*` files, confirmed by RESEARCH.md and the… | closed |
| 06-08 / T-06-08-01 | Tampering | every fin placement string (DATA tab, sidebar, drawing, toe-aim tables) | high | mitigate | The three surfaces are flipped in one task so no commit leaves them disagreeing; the family describe block asserts `mark` for EVERY… | closed |
| 06-08 / T-06-08-02 | Tampering | `lib/geometry/fins.ts` placement math and golden fixtures | high | mitigate | No arithmetic, bound, step or fixture is edited; the golden-parity blocks and `lib/geometry/template.test.ts` stay unedited and green,… | closed |
| 06-08 / T-06-08-03 | Spoofing | Imperial output | high | mitigate | A new test asserts `formatMark` and `formatDim` print an identical imperial string for a real resolved off-tail value, so the claim… | closed |
| 06-08 / T-06-08-04 | Information disclosure | the toe-aim tables' headings vs their cells | medium | mitigate | The cell formatter and the heading's unit marker flip in the same task, so a heading can never name a unit its cells are not printed in. | closed |
| 06-08 / T-06-08-SC | Tampering | npm/pip/cargo installs | low | accept | No package is installed by this plan. | closed |
| 06-09 / T-06-09-01 | Information disclosure | the standalone typed Board Length box | high | mitigate | The box is widened to 96px, 82px of text room against a 63px longest string — nearly 20px of margin, so no value in either screen's… | closed |
| 06-09 / T-06-09-02 | Tampering | the ROCKER datasheet's layout | medium | mitigate | Bare mode's class string is kept byte-identical and asserted by an acceptance grep, and no datasheet file is edited, so the table's… | closed |
| 06-09 / T-06-09-03 | Repudiation | the recorded contract | medium | mitigate | The UI-SPEC row that asserted the old width is rewritten with measured pixels and cites the debug session, so a later reviewer does not… | closed |
| 06-09 / T-06-09-SC | Tampering | npm/pip/cargo installs | low | accept | No package is installed by this plan. | closed |

*Status: open · closed · open — below high threshold (non-blocking)*
*Severity: critical > high > medium > low — only open threats at or above workflow.security_block_on count toward threats_open*
*Disposition: mitigate (implementation required) · accept (documented risk) · transfer (third-party)*

### Closure note for 06-07 / T-06-02

**Closed 2026-09-05 by quick task 260905-pne (commit 82e23f2).** `lib/units-isolation.test.ts` now carries a five-assertion source-contract block pinning the Volume card's litres figure as a plain two-decimal number that never takes the units system on any line it lives on, that the estimator passes it through unconverted, and that the display boundary offers no Litres-with-system signature; the executor ran a mutation proof (appending `{system}` to a litres line turned the suite red, then the card was restored byte-identical). Full suite 2012 passed. Original finding: the plan promised that the litres rendering "takes no system argument at all, asserted structurally so SCRN-05 cannot regress silently". The code is correct today: components/volume/volume-calculation-card.tsx renders `quotedVolumeLitres.toFixed(2)` L with no system argument, and lib/geometry/volume.ts / volume.test.ts are untouched by the phase. But the promised durable assertion was discharged only by one-shot acceptance greps in the plan; no persisted test pins it. A future edit that branched the litres figure on the system would pass the whole suite. Remedy: one source-contract assertion on volume-calculation-card.tsx in lib/units-isolation.test.ts's existing idiom. Audit note: code-review finding CR-01 (typed Board Length bounds passed in the slider's millimetre domain where the field expected centimetres — fixed in a5c6801 with typedFieldBounds and an integration test) was a failure class the register did not anticipate; it is closed on stronger evidence than planned.

---

## Accepted Risks Log

| Risk ID | Threat Ref | Rationale | Accepted By | Date |
|---------|------------|-----------|-------------|------|
| AR-06-01 | 06-01 / T-06-SC | No package is installed by this phase — RESEARCH.md confirms zero new dependencies and the UI-SPEC's Registry Safety section confirms… — git-verified: no dependency, lock-file or components/ui change anywhere in the phase range | plan author (06-CONTEXT.md / plan threat model), verified by gsd-security-auditor | 2026-09-05 |
| AR-06-02 | 06-02 / T-06-SC | No package is installed by this plan — `MeasureField` is built on the already-vendored `components/ui/input.tsx`, and the UI-SPEC's… — git-verified: no dependency, lock-file or components/ui change anywhere in the phase range | plan author (06-CONTEXT.md / plan threat model), verified by gsd-security-auditor | 2026-09-05 |
| AR-06-03 | 06-03 / T-06-SC | No package is installed by this plan. — git-verified: no dependency, lock-file or components/ui change anywhere in the phase range | plan author (06-CONTEXT.md / plan threat model), verified by gsd-security-auditor | 2026-09-05 |
| AR-06-04 | 06-04 / T-06-SC | No package is installed by this plan. — git-verified: no dependency, lock-file or components/ui change anywhere in the phase range | plan author (06-CONTEXT.md / plan threat model), verified by gsd-security-auditor | 2026-09-05 |
| AR-06-05 | 06-05 / T-06-SC | No package is installed by this plan. — git-verified: no dependency, lock-file or components/ui change anywhere in the phase range | plan author (06-CONTEXT.md / plan threat model), verified by gsd-security-auditor | 2026-09-05 |
| AR-06-06 | 06-06 / T-06-SC | No package is installed by this plan. — git-verified: no dependency, lock-file or components/ui change anywhere in the phase range | plan author (06-CONTEXT.md / plan threat model), verified by gsd-security-auditor | 2026-09-05 |
| AR-06-07 | 06-07 / T-06-08 | The part-converted Summary shows metric in the shared components and inches elsewhere until Phase 7. This is a legibility inconsistency… — git-verified: no dependency, lock-file or components/ui change anywhere in the phase range | plan author (06-CONTEXT.md / plan threat model), verified by gsd-security-auditor | 2026-09-05 |
| AR-06-08 | 06-07 / T-06-SC | No package is installed by this phase — zero new dependencies and zero new `components/ui/*` files, confirmed by RESEARCH.md and the… — git-verified: no dependency, lock-file or components/ui change anywhere in the phase range | plan author (06-CONTEXT.md / plan threat model), verified by gsd-security-auditor | 2026-09-05 |
| AR-06-09 | 06-08 / T-06-08-SC | No package is installed by this plan. — git-verified: no dependency, lock-file or components/ui change anywhere in the phase range | plan author (06-CONTEXT.md / plan threat model), verified by gsd-security-auditor | 2026-09-05 |
| AR-06-10 | 06-09 / T-06-09-SC | No package is installed by this plan. — git-verified: no dependency, lock-file or components/ui change anywhere in the phase range | plan author (06-CONTEXT.md / plan threat model), verified by gsd-security-auditor | 2026-09-05 |

*Accepted risks do not resurface in future audit runs.*

---

## Security Audit Trail

| Audit Date | Threats Total | Closed | Open | Run By |
|------------|---------------|--------|------|--------|
| 2026-09-05 | 34 | 33 | 1 | gsd-security-auditor (opus), ASVS L1, block_on high; full suite 2007 passed |
| 2026-09-05 | 34 | 34 | 0 | orchestrator re-check after quick task 260905-pne added the litres guard (lib/units-isolation.test.ts); full suite 2012 passed |

### Audit evidence (2026-09-05)

- Typed entry never stores an unreadable value: lib/geometry/measure-display.ts commitTypedMeasure returns the current value plus an error line on a null parse; pinned in lib/geometry/measure-display.test.ts.
- Display never writes: every export of measure-display.ts returns a string; lib/units-isolation.test.ts bars the units modules from the design store and snapshot, and its ledger pins all 15 design-screen files as converted with zero banned imperial formatter imports.
- Metric ranges sit inside their inch ranges: lib/geometry/units.test.ts asserts eight ranges to 1e-6 mm and on the step grid.
- Nothing snaps on a flip: measureSlider only clamps/snaps inside toMm, called on a drag; 06-01 tests cover a 1524 mm board against a 1530 mm metric floor.
- Geometry untouched: MEASURE_STATION_MM read-only; rail-bands, rocker, volume, fins placement math and golden fixtures have no phase-06 commit; template.test.ts frozen pins green.
- Fin families: every DATA row is tagged at construction and asserted mark for EVERY row; formatMark and formatDim proven identical in Imperial on a real off-tail value; toe-aim headings and cells flip together.
- Typed box: standalone 96px and bare 64px class strings both asserted; datasheet untouched.
- Supply chain: package.json / package-lock.json unchanged across the phase; no components/ui/* added.

---

## Sign-Off

- [x] All threats have a disposition (mitigate / accept / transfer)
- [x] Accepted risks documented in Accepted Risks Log
- [x] `threats_open: 0` confirmed
- [x] `status: verified` set in frontmatter

**Approval:** verified 2026-09-05
