---
phase: 6
slug: the-design-screens-in-metric
# status lifecycle: draft (seeded by plan-phase) → validated (set by validate-phase §6)
# audit-milestone §5.5 distinguishes NOT-VALIDATED (draft) from PARTIAL (validated + nyquist_compliant: false) (#2117)
status: draft
nyquist_compliant: true
wave_0_complete: false
created: 2026-09-05
---

# Phase 6 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

In plain English: this is the list of checks that prove, after every single change, that the
board's numbers still read right and nothing that already worked has moved. Every row below is a
command that already runs today or a test file one of the seven plans writes before it writes the
code it covers.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | Vitest 4.1.11 (`"vitest": "^4.1.11"` in `package.json`; the runner reports `RUN v4.1.11`) |
| **Config file** | `vitest.config.ts` — `environment: "node"`, `include: ["lib/**/*.test.ts", "components/**/*.test.ts"]`, `@` aliased to the repo root |
| **Quick run command** | `npm test -- <changed test file>` — e.g. `npm test -- lib/geometry/units.test.ts` |
| **Full suite command** | `npm test` (resolves to `vitest run` — a single pass, never watch mode) |
| **Estimated runtime** | quick ~1.0 s · full suite ~5.7 s (measured 2026-09-05: 30 files, 1901 passed, 2 skipped) |

There is no DOM in this project's test environment and no testing-library, so component coverage in
this phase takes two shapes: pure-function tests in `lib/geometry/`, and *source-contract* tests
that read the real component file, strip its comments and assert a structural property — the idiom
`components/design/slider-row.test.ts` and `lib/units-isolation.test.ts` already ship.

---

## Sampling Rate

- **After every task commit:** run `npm test -- <that task's changed test file>` — the exact command
  in that task's first `<automated>` block. Feedback in about a second.
- **After every plan wave:** run `npm test` — every task also carries `npm test` as its second
  `<automated>` gate, so the full suite is green at each of the seven wave boundaries.
- **Before `/gsd-verify-work`:** full suite green, and `lib/geometry/template.test.ts`,
  `lib/geometry/rocker.test.ts`, `lib/geometry/rail-bands.test.ts`, `lib/geometry/fins.test.ts` and
  `lib/geometry/volume.test.ts` green **without having been edited** — those golden-fixture suites
  are the proof that a units change never moved the geometry itself.
- **Max feedback latency:** ~1 s for a targeted file, ~6 s for the whole suite.
- **No watch mode:** `npm run test:watch` appears in no plan gate; every gate is a single run that
  exits with a status.

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Threat Ref | Secure Behavior | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|------------|-----------------|-----------|-------------------|-------------|--------|
| 06-01-01 | 01 | 1 | SCRN-01 | T-06-01, T-06-03 | A metric bound never lands outside its own inch range, and an unreadable typed string returns null rather than a coerced number | unit | `npm test -- lib/geometry/measure-display.test.ts lib/geometry/units.test.ts` | ❌ W0 (`measure-display.test.ts` new, written by this task) | ⬜ pending |
| 06-01-02 | 01 | 1 | SCRN-01 | T-06-02 | Formatting is a read — no converted slider's display path writes to the design store | contract | `npm test -- lib/units-isolation.test.ts` | ✅ | ⬜ pending |
| 06-01-03 | 01 | 1 | SCRN-03 | T-06-02 | The Template viewer hands strings to the callout primitives and writes nothing; the ledger fails if it formats outside the boundary | contract | `npm test -- lib/units-isolation.test.ts` | ✅ | ⬜ pending |
| 06-02-01 | 02 | 2 | SCRN-02 | T-06-01 | The raw typed string stays in local component state; `onCommit` fires only when the commit returned a null error, after parse, clamp and snap | unit + contract | `npm test -- lib/geometry/measure-display.test.ts components/design/measure-field.test.ts` | ❌ W0 (`measure-field.test.ts` new, written by this task) | ⬜ pending |
| 06-02-02 | 02 | 2 | SCRN-01, SCRN-02 | T-06-02 | A Board Length commit writes the stored millimetre and nothing else; the units preference stays a render-time argument | contract | `npm test -- components/design/slider-row.test.ts` | ✅ | ⬜ pending |
| 06-02-03 | 02 | 2 | SCRN-01, SCRN-02 | T-06-02 | Same commit guarantee on the Fins screen, and the ledger now holds the Template Builder as fully converted | contract | `npm test -- components/design/slider-row.test.ts lib/units-isolation.test.ts` | ✅ | ⬜ pending |
| 06-03-01 | 03 | 3 | SCRN-01 | T-06-02 | The rocker and foil sliders render strings and commit explicit shaper edits only — ledger-guarded | contract | `npm test -- lib/units-isolation.test.ts` | ✅ | ⬜ pending |
| 06-03-02 | 03 | 3 | SCRN-02, SCRN-03 | T-06-01 | Each datasheet cell clamps to the same range its sidebar slider allows and snaps before storing; unreadable input reverts | contract | `npm test -- lib/units-isolation.test.ts components/design/measure-field.test.ts` | ✅ (from 06-02-01) | ⬜ pending |
| 06-03-03 | 03 | 3 | SCRN-03 | T-06-04, T-06-02 | `MEASURE_STATION_MM` is read, never written — `rocker.test.ts` and `template.test.ts` stay green unedited | contract | `npm test -- lib/units-isolation.test.ts` | ✅ | ⬜ pending |
| 06-04-01 | 04 | 4 | SCRN-01 | T-06-02 | `computeRailBands`'s own snaps are untouched — the rail-band golden fixtures stay green unedited | unit + contract | `npm test -- lib/geometry/rail-bands.test.ts components/design/slider-row.test.ts` | ✅ | ⬜ pending |
| 06-04-02 | 04 | 4 | SCRN-03 | T-06-02 | The rail table renders strings only; an absent value is still an em dash and a hard edge still reads Hard Edge | contract | `npm test -- lib/units-isolation.test.ts` | ✅ | ⬜ pending |
| 06-04-03 | 04 | 4 | SCRN-03 | T-06-05 | The metric grid pitch produces ticks that agree with the table's marks — pinned in both systems, on code that had no test at all | unit | `npm test -- components/rails/rail-section-plot.test.ts` | ❌ W0 (`rail-section-plot.test.ts` new, written by this task) | ⬜ pending |
| 06-05-01 | 05 | 5 | SCRN-03 | T-06-06 | Every fin summary row carries an explicit family tag, so a toe-in can never be printed as centimetres | unit | `npm test -- lib/geometry/fins.test.ts` | ✅ | ⬜ pending |
| 06-05-02 | 05 | 5 | SCRN-03 | T-06-02 | The toe-aim placement arithmetic is untouched and the highlighted column is the same index in both systems | unit | `npm test -- lib/geometry/fins.test.ts` | ✅ | ⬜ pending |
| 06-05-03 | 05 | 5 | SCRN-01, SCRN-03 | T-06-02, T-06-06 | Both fins data surfaces format through the display boundary only; the ledger fails the suite otherwise | unit + contract | `npm test -- lib/units-isolation.test.ts lib/geometry/fins.test.ts` | ✅ | ⬜ pending |
| 06-06-01 | 06 | 6 | SCRN-01, SCRN-02 | T-06-01 | A cleared Override box commits the minimum, never a non-finite value; the box and its slider read one shared bounds source | contract | `npm test -- components/design/slider-row.test.ts` | ✅ | ⬜ pending |
| 06-06-02 | 06 | 6 | SCRN-01 | T-06-06 | Family classification follows D-01 per control rather than being inferred, and `fins.test.ts` stays green unedited | unit | `npm test -- lib/geometry/fins.test.ts` | ✅ | ⬜ pending |
| 06-06-03 | 06 | 6 | SCRN-03 | T-06-02 | The fin drawing renders strings only and the placement math is untouched | contract | `npm test -- lib/units-isolation.test.ts` | ✅ | ⬜ pending |
| 06-07-01 | 07 | 7 | SCRN-01, SCRN-03 | T-06-07 | The area and cubic conversions live only in `lib/geometry/units.ts`; the card's local factor constant is deleted and stays deleted | unit | `npm test -- lib/geometry/units.test.ts lib/geometry/measure-display.test.ts` | ✅ | ⬜ pending |
| 06-07-02 | 07 | 7 | SCRN-01, SCRN-03, SCRN-05 | T-06-02 | The volume math is untouched and the litres line takes no units-system argument at all — asserted structurally, not assumed | unit + contract | `npm test -- lib/units-isolation.test.ts lib/geometry/volume.test.ts` | ✅ | ⬜ pending |
| 06-07-03 | 07 | 7 | SCRN-03, SCRN-05 | T-06-02, T-06-08 | The ledger closes: no design-screen display file formats outside the boundary, and the part-converted Summary is a recorded, accepted step toward Phase 7 | contract | `npm test -- lib/units-isolation.test.ts` | ✅ | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

**Every task additionally carries `npm test` as its second `<automated>` gate**, so the full suite is
green at each of the 21 task commits, not only at wave boundaries.

**T-06-SC (supply chain)** is dispositioned *accept* in all seven plans: this phase installs no npm
package and adds no `components/ui/*` file, so there is no install surface to audit and no package
legitimacy checkpoint applies. Nothing in this map covers it because there is nothing to cover.

---

## Wave 0 Requirements

This phase has no separate Wave 0 plan. Each new test file is written **TDD-first inside the task
that first needs it**, in an earlier wave than any task that later runs it — so no `<automated>`
command in the map above names a file that does not yet exist when it runs.

- [ ] `lib/geometry/measure-display.test.ts` — **new file**, created by task 06-01-01 (wave 1)
      alongside `lib/geometry/measure-display.ts` itself. Covers the display boundary
      (`formatDim`, `formatMark`, `formatLength`, `stationLabel`, `columnUnitSuffix`,
      `measureSlider`, `commitTypedMeasure`) and iterates `UNITS_SYSTEMS` rather than naming the two
      systems by hand. Re-run by 06-02-01 (wave 2) and 06-07-01 (wave 7).
- [ ] `components/design/measure-field.test.ts` — **new file**, created by task 06-02-01 (wave 2).
      The source-contract test for the one typed measurement box: one `Input`, at most one error
      `<div>`, no error copy or parser declared in the component. Re-run by 06-03-02 (wave 3).
      (RESEARCH.md sketched this as `components/rocker/metric-field.test.ts`; the plans promoted the
      field to one system-aware `MeasureField` under `components/design/`, so the test moved with it.)
- [ ] `components/rails/rail-section-plot.test.ts` — **new file**, created by task 06-04-03 (wave 4).
      Pins the cross-section plot's grid-tick values against the same physical bounds in both
      systems. This generation code has no test today in either system.
- [ ] `lib/geometry/units.test.ts` — **existing file, extended** by 06-01-01 with `metricSliderRange`
      (the D-06 bounds-inside-bounds invariant across every range the phase uses) and by 06-07-01
      with the cm² / cm³ conversions.
- [ ] `lib/units-isolation.test.ts` — **existing file, extended** by 06-01-02 with the phase ledger
      (`DESIGN_SCREEN_DISPLAY_FILES`, `BANNED_DISPLAY_FORMATTERS`, `OUT_OF_SCOPE_UNITS_FILES`), then
      updated by nine later tasks as each screen flips to converted.
- [ ] `lib/geometry/fins.test.ts` — **existing file, extended** by 06-05-01 with the per-row family
      classification assertion (RESEARCH Pitfall 1).
- [ ] `components/design/slider-row.test.ts` — **existing file**; its `ALLOWLIST` reason strings for
      `OUTLINE_PATH`, `FINS_PATH` and `VOLUME_PATH` are rewritten in 06-02-02 and 06-02-03 to
      describe the Board Length control's new per-system middle row. The counts (1, 2, 1) are
      asserted unchanged — the allowlist is updated to the truth, never loosened to make a count pass.

No framework install is needed: Vitest 4.1.11 and `vitest.config.ts` already ship, and both new test
files land inside the config's existing `include` globs.

---

## Manual-Only Verifications

Every task in the phase has automated coverage; the checks below are the *additional* ones a shaper
does in a browser, because they are about what the screen looks like rather than what a function
returns. Sixteen of the 21 tasks carry a `<human-check>` block for the browser review between
changes; they are grouped here by screen.

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| Template Builder reads metric: Width `51.4 cm` stepping a millimetre, Offset signed, Depth in whole mm, viewer callouts in cm | SCRN-01, SCRN-03 | The node test environment has no DOM, so a rendered slider label and a drawn callout can only be read on screen | On Metric open `/design/outline`: Width reads `Width — 51.4 cm` on a 20 1/4 in board, the thumb steps 1 mm and stops at 40.7 and 63.5; Offset reads `+`/`-` and `0 cm` dead centre; Depth reads whole mm on a swallow or diamond tail; the viewer's length, three width and tail block callouts read cm with stations `@ 30.5 cm`. Switch to Imperial: every row and callout is exactly as before, dual length form included. Check one dark theme as well as Daylight (tasks 06-01-01/02/03) |
| Typing a board length on TEMPLATE, VOLUME and FINS | SCRN-02 | Focus, blur, Enter and the error line are DOM behaviour with no DOM to render into | On Metric, type `188` and press Enter on each of the three screens: the thumb moves and the row re-labels `188.0 cm`; the slider steps 1 cm and stops at 153/304 (TEMPLATE, VOLUME) and 122/365 (FINS). Type `5 1/2`: the last good number comes back with the error line under the box. Tick "import from template" on FINS: the row dims exactly as before. On Imperial the two dropdowns are back, unchanged (tasks 06-02-02, 06-02-03) |
| Rocker sidebar, datasheet and drawing read metric | SCRN-01, SCRN-02, SCRN-03 | Table headers, per-cell typing and drawn callouts are on-screen behaviour | On Metric at `/design/rocker`: the seven sliders read whole mm and step 1 mm; the two lift read-outs name their station in cm; the datasheet's row labels say which unit each row is in, station columns are named in cm, cells are bare numbers, and typing a thickness then tabbing away re-prints a whole mm — nonsense puts the old number back with an error line; the drawing's five stations are named in cm and its callouts read mm without the drawing moving. Imperial unchanged. Check one dark theme (tasks 06-03-01/02/03) |
| Rails sidebar, data table and 10 mm cross-section grid | SCRN-01, SCRN-03 | Grid pitch is judged by counting squares against the table — an eye check the tick test supports but cannot replace | On Metric at `/design/rails`: thickness, Corner Cut and Bottom Tuck 3 read whole mm and step 1 mm; nose/tail thickness rows name their station in cm; the Deck Profile clamp note appears exactly when it did. On the DATA page the rail table shows `(mm)` per section column with bare cells, em dashes and Hard Edge intact. On the plot the grid squares are 10 mm, ticks count 0, 10, 20 and one tick per axis says mm — count squares against the table's marks and confirm they agree. Imperial pixel-for-pixel unchanged (tasks 06-04-01/02/03) |
| Fins DATA tab, toe-aim tables, sidebar and drawing | SCRN-01, SCRN-03 | Family-by-family reading (cm vs mm in the same group) is exactly the kind of mistake only a human notices | On Metric at `/design/fins`: the DATA summary line reads its length and tail width each with its own cm; off-tail rows read cm and toe-in / off-rail rows read whole mm in the same group; both toe-aim table headings say cm and the highlighted column is the one Imperial highlighted. On the sidebar every slider reads in its right family, each Fin Base Length reads `114 mm standard`, Override takes whole mm bounded 64–190, and no inch mark is left anywhere, the quad rear heading included. The drawing's toe and off-rail callouts read mm, off-tail cm, nothing has moved. Imperial unchanged. Check one dark theme (tasks 06-05-03, 06-06-01/02/03) |
| Volume screen reads metric and quotes the same litres | SCRN-01, SCRN-03, SCRN-05 | The cross-screen litres agreement is read off two different screens at once | On Metric at `/design/volume`: Board Width and Center Thickness read cm and step 1 mm; the card's dimension rows read cm, cross-section and weighted thickness read whole mm, the area line reads cm² and the supporting line cm³. Confirm the litres figure is the same number it was on Imperial **and** the same number the setup screen's card quotes for the same board. Imperial unchanged (task 06-07-02) |
| **Backstop 1** — no flash of inches on the Summary | SCRN-03 | First-paint and hydration behaviour cannot be observed from a node test; it needs a real hard reload | With Metric chosen, hard-reload `/design/summary` and watch the first frame: the outline callouts, rocker callouts, rail plot and rail data table must read metric from the very first frame, with no inch values appearing and no hydration warning in the browser console. Repeat once signed in and once signed out (task 06-07-03) |
| **Backstop 2** — the order form's overflow audit on Metric | SCRN-03 | Paper layout at Letter and A4 is only observable in a print preview | With Metric chosen, open the browser's print preview of `/design/summary` and re-run the order form's usual overflow check on every compact panel. The compact rail table's section headers now carry a unit suffix and those panels clip overflow by design — confirm no header or row is cut off on Letter or A4. Record the result in the summary; if anything clips, file it rather than widening a panel in this phase (task 06-07-03) |
| Final sweep across all five design screens | SCRN-01, SCRN-03 | A stray inch mark anywhere is a whole-phase acceptance question, not a per-file one | Walk the five design screens on Metric looking for any stray inch mark; then walk them on Imperial and confirm every screen reads exactly as it did before the phase (task 06-07-03) |
| **Imperial byte-identity** (the phase's headline prohibition, marked `flagged-unverified` in Plans 01, 02 and 07) | SCRN-01, SCRN-02, SCRN-03 | No snapshot of the shipped imperial strings exists to diff against, and adding one is out of scope for this phase | Read the git diff of every converted file and confirm each Imperial branch produces the same string it produced before — labels, cells, callouts, option lists, trigger classes and error lines. Pair it with the Imperial half of each screen review above. If any imperial string genuinely has to change, stop and raise it rather than absorbing it into a metric commit |

---

## Validation Sign-Off

- [x] All tasks have `<automated>` verify or Wave 0 dependencies — 21 of 21 tasks carry a targeted
      `<automated>` command plus `npm test`
- [x] Sampling continuity: no 3 consecutive tasks without automated verify — there is no task
      without one
- [x] Wave 0 covers all MISSING references — the three new test files are each created by the task
      that first names them, in an earlier wave than any task that re-runs them
- [x] No watch-mode flags — every gate is `npm test` or `npm test -- <file>`, both single runs;
      `npm run test:watch` appears in no plan
- [x] Feedback latency < 6s — ~1.0 s targeted, ~5.7 s full suite, measured 2026-09-05
- [x] `nyquist_compliant: true` set in frontmatter

**Approval:** approved 2026-09-05
