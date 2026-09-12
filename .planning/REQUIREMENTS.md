# Milestone v1.2 Requirements: Rails Finished, Phone Ready

**Status:** Mapped to phases 2026-09-07
**Phases:** 8–10 (continuing from v1.1, which ended at Phase 7) — see [ROADMAP.md](ROADMAP.md)
**Research:** [research/SUMMARY.md](research/SUMMARY.md)

**Goal:** Finish the rails screen the prototype always had, and make the whole app something a shaper can actually use on a phone.

## v1.2 Requirements — Rails Finished, Phone Ready

Requirements are written as things a shaper can do or see. IDs continue from the existing families: `RAIL-01` (v1.0) and `PRNT-01`–`PRNT-04` (v1.1) are taken; `PHON` and `TEST` are new for this milestone.

### Rails Screen

- [x] **RAIL-02**: User can open an INSTRUCTIONS tab on the rails screen, beside VIEWER and DATA, showing a live example rail with every mark named by a callout. The rail is drawn by the existing calculator — no new geometry — and its expected numbers are pinned by a golden-fixture entry extracted from the prototype, never hand-typed
- [x] **RAIL-03**: User can flip the example rail between Flat and Domed and watch it reshape (3.5" flat / 3" domed, as in the prototype)
- [x] **RAIL-04**: User can open "View Full Sized" to see the rail cross-section at 1:1 on screen to hold against the foam, with a one-line note that it assumes a standard screen at 100% zoom; there is no calibration step
- [x] **RAIL-05**: User can see a plan and side view of the board on the rails screen showing where the nose, centre and tail sections sit, with legend checkboxes to show or hide each reference
- [x] **RAIL-06**: Every new number on the rails screen reads in the shaper's chosen system under the v1.1 rules — rail marks in whole millimetres in Metric, inches and fractions in Imperial

### Printed Outputs

- [x] **PRNT-05**: User can tick "Include Rail Band Instructions in Print" on the rails screen and the instructions sheet appears on the order form's printed reference page, in the chosen system (whether the box starts ticked, and whether it saves with the board, is settled in the phase discussion)
- [x] **PRNT-06**: With the box unticked, every printed output — order form, Overview Sheet, Full Sized Template, Paper Saver — is unchanged, proven the way Phase 7 proved it: regenerate and diff against the pre-milestone build

### Phone: The Design Screens

- [x] **PHON-01**: On a phone, each of the five design screens stacks its controls and viewer so nothing overlaps and nothing is hidden — every control reachable on a desktop is reachable on the phone
- [x] **PHON-02**: The page fits the phone's visible area even as Safari's toolbar comes and goes — no clipped content and no trapped scrolling
- [x] **PHON-03**: Sliders, buttons, tabs and typed fields are sized for a finger (44px-class targets), and tapping a number field does not zoom the page
- [x] **PHON-04**: User can drag outline, rocker and foil points with a thumb — hit zones big enough for a finger, not overlapping neighbouring points, with no long-press text popup mid-drag
- [x] **PHON-05**: Desktop mouse drag and keyboard operation behave exactly as they do today on every viewer touched
- [x] **PHON-06**: The board drawings use the full phone width so they are legible (pinch-zoom deliberately not included)

### Phone: The Rest of the App

- [x] **PHON-07**: User can sign in, sign up and use the account menu on a phone
- [x] **PHON-08**: User can pick a preset and open, rename, duplicate or delete a saved board from the rack, on a phone
- [x] **PHON-09**: User can read the summary and the on-screen order form on a phone (printing stays a desktop job)
- [x] **PHON-10**: The whole flow — sign in → pick a preset → open from the rack → all five design screens → save → summary — works end to end on a real iPhone and a real Android phone *(closed on the iPhone alone — the Android walk was skipped by the founder, decision D-12 in 10-SWEEP-2.md, 2026-09-12)*

### Testing

- [x] **TEST-01**: Playwright is installed with iPhone and Android device profiles, and automated tests prove the stacked phone layout and touch drag on at least the outline viewer, so later phone changes can't quietly break them

## Future Requirements (deferred, not in v1.2)

- Pinch-zoom and pan on the curve viewers — revisit only if real phone use shows fill-the-screen sizing is still too small
- A magnifier or drag-with-offset precision aid — the slider and typed-entry path already gives exact numbers; add only if shaper feedback asks for it
- A calibrated (credit-card) actual-size view — the printed 1:1 template already carries the ruler-true guarantee
- Extending the plan/side reference view to the fins and foil screens if the rails version proves useful
- Printing itself from a phone

## Out of Scope

- A reduced "view-only" phone mode — contradicts the milestone; every screen must work end to end
- Any gesture library or a swap of the UI primitive library — the existing Pointer Events pattern and Base UI already do the job
- Auto-detecting the screen's physical size for the 1:1 view — no web API reports it reliably; the standard-screen assumption with a plain caveat is the honest choice
- A `halveDeckMark1` geometry variant — the prototype's flag is dead code (verified 2026-09-07), so porting it would invent behaviour the reference never had
- 3D visualization or orbit gestures — already out of scope for the product

## Traceability

| Requirement | Phase | Status | Outcome |
|---|---|---|---|
| RAIL-02 | Phase 8 | Complete | — |
| RAIL-03 | Phase 8 | Complete | — |
| RAIL-04 | Phase 8 | Complete | — |
| RAIL-05 | Phase 8 | Complete | — |
| RAIL-06 | Phase 8 | Complete | — |
| PRNT-05 | Phase 8 | Complete | — |
| PRNT-06 | Phase 8 | Complete | — |
| PHON-01 | Phase 9 | Complete | — |
| PHON-02 | Phase 9 | Complete | — |
| PHON-03 | Phase 9 | Complete | — |
| PHON-04 | Phase 9 | Complete | — |
| PHON-05 | Phase 9 | Complete | — |
| PHON-06 | Phase 9 | Complete | — |
| PHON-07 | Phase 10 | Complete | — |
| PHON-08 | Phase 10 | Complete | — |
| PHON-09 | Phase 10 | Complete | — |
| PHON-10 | Phase 10 | Complete | —  iPhone only; Android skipped by founder (D-12) |
| TEST-01 | Phase 9 | Complete | — |

All 18 v1.2 requirements are mapped, each to exactly one phase: Phase 8 owns the seven rails and
print items, Phase 9 the six design-screen phone items plus the Playwright test harness, and
Phase 10 the four remaining phone items including the real-device end-to-end pass.
