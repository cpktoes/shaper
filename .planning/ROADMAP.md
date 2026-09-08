# Roadmap: Shaper

## Overview

Shaper started from a working prototype (built in Claude Design) that already proved out the two "secret sauce" calculators — rail band and fin placement — but lived outside the codebase as a single self-contained page. **Milestone v1.0 (Phases 1–4, complete 2026-08-29)** ported that prototype into a real Next.js app and got it live with accounts and saving, proved the geometry math trustworthy and extended it to volume and printable templates, then built the rocker and foil editors as first-class interactive tools. A shaper can now log in, shape a full board design (outline, rocker, rail, foil, fins), see live-calculated rail band dimensions, fin placement and volume, save it as a named model, and print a full-size template to cut foam from — all of it in inches and litres.

**Milestone v1.1 (Phases 5–7, complete 2026-09-06)** gives the shaper a choice. Every board is already stored in millimetres, so this is presentation work: a units chooser in the settings menu, one set of metric formatters and parsers beside the imperial ones in `lib/geometry/units.ts`, and then every place a number is shown — roughly 300 of them across about 25 files — reading the shaper's chosen system instead of assuming inches. It lands in three passes a shaper can see and try one at a time: the chooser itself proving out on the setup screen, then the five design screens, then everything that comes out of a printer.

**Milestone v1.2 (Phases 8–10)** finishes what the prototype started and takes the app off the desk. The rails screen has always been missing its third tab — the INSTRUCTIONS page that names every mark on a rail cross-section and lets a shaper flip the example between Flat and Domed — along with a 1:1 on-screen view to hold against the foam, a plan and side reference showing where each section sits on the board, and an option to fold that instructions sheet into what gets printed. None of it needs new geometry: the prototype's `halveDeckMark1` flag turned out to be dead code, so the rail-band calculator already in `lib/` draws the example rail exactly as the reference did. The second half is phone work, and it is not polish — the five design screens carry zero responsive breakpoints today, so the phone layout is built from scratch and touch-first: one shared screen shell instead of five copies of the same sidebar-and-canvas layout, drawings that fill the screen, and drag handles on the outline, rocker and foil curves sized for a thumb. It lands in three passes: rails first (the smaller, self-contained port), then the design screens on a phone (where touch drag lives), then everything around them — sign-in, presets, the rack and the summary — walked end to end on a real iPhone and a real Android phone.

## Phases

**Phase Numbering:**

- Integer phases (1, 2, 3): Planned milestone work
- Decimal phases (2.1, 2.2): Urgent insertions (marked with INSERTED)

Decimal phases appear between their surrounding integers in numeric order.

**Milestone v1.0 — the design tool, in inches (complete)**

- [x] **Phase 1: Foundation — Port & Deploy the Design Tool** - Port the Claude Design prototype into a real Next.js app, live on Vercel, with outline shaping, rail-band calc, and fin-placement calc working (completed 2026-08-21)
- [x] **Phase 2: Accounts & Saved Designs** - Users sign up/log in via Clerk and their designs persist in Neon Postgres across sessions (completed 2026-08-28)
- [x] **Phase 3: Volume, Templates & Verified Math** - Live volume calculation, printable full-size templates, and automated tests proving the geometry math correct (completed 2026-08-28)
- [x] **Phase 4: Rocker & Foil Editors** - Interactive rocker and foil editors complete the design surface, feeding rail band and volume live (completed 2026-08-29)

**Milestone v1.1 — Imperial vs Metric (complete)**

- [x] **Phase 5: The Units Chooser** - Imperial/Metric picker in the settings menu, saved on the account and remembered per browser, proving itself on the setup screen's preset and rack cards (completed 2026-09-05)
- [x] **Phase 6: The Design Screens in Metric** - Every slider, typed field, viewer callout and data table on the five design screens reads and accepts the chosen system (completed 2026-09-05)
- [x] **Phase 7: Metric on Paper** - The order form, Overview Sheet, Full Sized Template and Paper Saver all print in the chosen system, with 1:1 scale still true (completed 2026-09-06)

**Milestone v1.2 — Rails Finished, Phone Ready**

- [ ] **Phase 8: The Rails Screen, Finished** - The INSTRUCTIONS tab with its named example rail and Flat/Domed toggle, "View Full Sized" at 1:1, the plan and side reference view, and an option to fold the instructions sheet into what gets printed
- [ ] **Phase 9: The Design Screens on a Phone** - One shared screen shell stacks the five design screens for a narrow screen, with finger-sized controls and outline, rocker and foil points a thumb can drag
- [ ] **Phase 10: The Whole App on a Phone** - Sign-in, presets, the rack and the summary reflowed and touch-sized, with the whole trip walked end to end on real phones

## Phase Details

Phases 1–4 below are the completed v1.0 record — goals, requirement IDs and completion dates. Their plan artifacts (PLAN.md, SUMMARY.md, VERIFICATION.md and the rest) are archived under `.planning/milestones/v1.0-phases/` and are not repeated here.

### Phase 1: Foundation — Port & Deploy the Design Tool

**Goal**: The ported prototype runs as a real Next.js/TypeScript/Tailwind v4/shadcn app, live on Vercel, letting a user set dimensions, shape an outline, and see rail-band and fin-placement numbers calculated from real formulas — with that math implemented as pure TypeScript functions under `lib/`, per the project's geometry constraint.
**Mode:** mvp
**Depends on**: Nothing (first phase)
**Requirements**: SETUP-01, OUTL-01, RAIL-01, FIN-01, FIN-02, FIN-03, VIZ-01, UNIT-01
**Plans**: 4/4 executed
**Completed**: 2026-08-21 — artifacts archived under `.planning/milestones/v1.0-phases/01-foundation-port-deploy-the-design-tool/`

### Phase 2: Accounts & Saved Designs

**Goal**: Users have their own account and their designs persist across sessions, completing the "live + saving" milestone.
**Mode:** mvp
**Depends on**: Phase 1
**Requirements**: ACCT-01, ACCT-02, ACCT-03, MODL-01, MODL-02, MODL-03
**Plans**: 6/6 executed
**Completed**: 2026-08-28 — artifacts archived under `.planning/milestones/v1.0-phases/02-accounts-saved-designs/`

### Phase 3: Volume, Templates & Verified Math

**Goal**: The core geometry math is proven correct by automated tests, board volume updates live as the design changes, and users can print a full-size template to cut foam from — completing the "the math is right" milestone.
**Mode:** mvp
**Depends on**: Phase 1
**Requirements**: VOL-01, TMPL-01
**Plans**: 7/7 executed
**Completed**: 2026-08-28 — artifacts archived under `.planning/milestones/v1.0-phases/03-volume-templates-verified-math/`

### Phase 4: Rocker & Foil Editors

**Goal**: Users can shape a rocker curve and a foil profile as first-class, interactive parts of the design, with rail band and volume recalculating live as they adjust either — completing the "shaper features" milestone's editor work.
**Mode:** mvp
**Depends on**: Phase 1, Phase 3
**Requirements**: ROCK-01, FOIL-01
**Plans**: 5/5 executed
**Completed**: 2026-08-29 — artifacts archived under `.planning/milestones/v1.0-phases/04-rocker-foil-editors/`

---

### Milestone v1.1: Imperial vs Metric (Phases 5–7, complete 2026-09-06)

Shipped — 21 plans across 3 phases. A shaper picks Imperial or Metric from the gear menu and every
number in the app follows: the setup screen, all five design screens, and everything that comes out
of a printer. Full phase detail archived in
[`.planning/milestones/v1.1-ROADMAP.md`](milestones/v1.1-ROADMAP.md); audit in
[`.planning/v1.1-MILESTONE-AUDIT.md`](v1.1-MILESTONE-AUDIT.md).

---

### Milestone v1.2: Rails Finished, Phone Ready (Phases 8–10, in progress)

Phases 8–10 below are the active v1.2 record. Requirements are defined in
[`REQUIREMENTS.md`](REQUIREMENTS.md); the research that shaped this structure is in
[`research/SUMMARY.md`](research/SUMMARY.md).

### Phase 8: The Rails Screen, Finished

**Goal**: A shaper can read what every mark on a rail cross-section means, hold the rail against the foam at actual size, see where each rail section sits along the board, and fold that reference sheet into what comes out of the printer.
**Depends on**: Phase 7 (the v1.1 units rules every new number obeys)
**Requirements**: RAIL-02, RAIL-03, RAIL-04, RAIL-05, RAIL-06, PRNT-05, PRNT-06
**Success Criteria** (what must be TRUE):

  1. On the rails screen a shaper can open a third tab, INSTRUCTIONS, beside VIEWER and DATA, and see a live example rail with every mark named beside it — and flip that rail between Flat and Domed and watch it reshape.
  2. A shaper can open "View Full Sized" and hold a ruler or a piece of foam against the rail cross-section on screen and find it actual size, with one plain line saying it assumes a standard screen at 100% zoom and no calibration step to work through.
  3. A shaper can see plan and side views of the whole board on the rails screen showing where the nose, centre and tail sections sit, and tick each reference on or off from a legend.
  4. Ticking "Include Rail Band Instructions in Print" puts that instructions sheet on the order form's printed reference page in whichever system the shaper reads in; with the box unticked, every printed output is exactly what it was before this milestone.
  5. Every new number on the screen reads in the shaper's chosen system — whole millimetres in Metric, inches and fractions in Imperial.

**Plans**: 4/6 plans executed

Plans:
**Wave 1**

- [x] 08-01-PLAN.md — The INSTRUCTIONS tab: a named example rail a shaper can flip between Flat and Domed (wave 1)
- [x] 08-02-PLAN.md — The print preference, built on the units machinery, plus the rails sidebar tick-box (wave 1)

**Wave 2** *(blocked on Wave 1 completion)*

- [x] 08-03-PLAN.md — The plan and side reference figure, its nine-item legend and the instructional copy (wave 2)

**Wave 3** *(blocked on Wave 2 completion)*

- [x] 08-04-PLAN.md — View Full Sized: the rail at actual size on screen and on paper, with its check bar (wave 3)

**Wave 4** *(blocked on Wave 3 completion)*

- [ ] 08-05-PLAN.md — The summary mirror tick-box and the third printed sheet (wave 4)

**Wave 5** *(blocked on Wave 4 completion)*

- [ ] 08-06-PLAN.md — Proving every printed output unchanged, then migrating production after deploy (wave 5)

**UI hint**: yes

**Settled findings that constrain this phase:**

- **No new geometry math.** The prototype's `halveDeckMark1` flag is dead code — it appears once, at the call site on `reference/project/Rails.dc.html` line 1359, and never in `computeSection`'s parameter list on line 704 (verified 2026-09-07). The existing `computeRailSection` already draws the example rail as the prototype drew it, and `lib/geometry/rail-bands.ts` is not modified. Rule 1 still applies: a new golden-fixture entry for the example rail, extracted by `scripts/extract-prototype-rails-golden.mjs` executing the prototype's own code, plus a test pinning it. Never hand-transcribe those numbers.
- **The instructions sheet attaches to the order form's printed reference page** (`components/summary/order-form.tsx`, live React under `@media print`), reusing the same component built for the tab — not to the jsPDF builders under `components/template/`, which stay exactly as v1.1 proved them. PRNT-06 is proven the way Phase 7 proved it: regenerate and diff against the pre-milestone build.
- **Two product decisions belong in discuss-phase, not in a plan:** whether the print toggle starts ticked, and whether it saves with the board or stays a session preference. The toggle is set on the rails screen and read on the summary screen, so it is cross-screen state and lives on the shared design store either way.
- The page's background artwork moves from `reference/project/assets/rail-bands-plan-bg.png` into `public/`.
- This phase lands before the Phase 9 shell extraction so two large edits don't collide in `rail-band-editor.tsx`.

### Phase 9: The Design Screens on a Phone

**Goal**: A shaper can shape a board on a phone — all five design screens laid out for a narrow screen, with controls and drag handles sized for a thumb, and desktop untouched.
**Depends on**: Phase 8
**Requirements**: PHON-01, PHON-02, PHON-03, PHON-04, PHON-05, PHON-06, TEST-01
**Success Criteria** (what must be TRUE):

  1. On a phone, each of the five design screens stacks its controls and its drawing so nothing overlaps and nothing is hidden — every control a shaper can reach on a desktop is reachable on the phone.
  2. The page fits the phone's visible area as Safari's toolbar comes and goes — nothing clipped, no trapped scrolling — and the board drawings use the full width of the screen, so they are big enough to read.
  3. Sliders, buttons, tabs and typed fields are big enough to hit with a finger, and tapping a number field does not zoom the page.
  4. A shaper can drag outline, rocker and foil points with a thumb: hit zones sized for a finger, not overlapping their neighbours, and no long-press text popup interrupting a drag.
  5. On a desktop, mouse dragging and keyboard operation behave exactly as they do today on every viewer touched, and automated tests on iPhone and Android viewports prove the stacked layout and touch drag on at least the outline viewer, so later phone changes can't quietly break them.

**Plans**: TBD
**UI hint**: yes

**Settled findings that constrain this phase:**

- **Extract one shared `components/design/design-screen-shell.tsx` first**, desktop-pixel-identical, and add the phone breakpoint there once. The sidebar-and-canvas layout is duplicated with zero breakpoints across `outline-editor.tsx`, `rocker-editor.tsx`, `rail-band-editor.tsx`, `fin-placement-editor.tsx` and `volume-estimator.tsx`; fixing the layout five times is the phase's main risk.
- **The `dvh` root and Next 16's `viewport` export land early** (`app/layout.tsx`), before any per-screen work — every other phone change depends on them.
- **Playwright is installed in this phase** (`@playwright/test`, dev dependency only) with iPhone and Android device profiles. It is the milestone's only new dependency, and until it lands, desktop-regression protection is a disciplined manual mouse-and-keyboard pass that each plan's verification must state explicitly.
- Touch drag reuses the Pointer Events + `setPointerCapture` + `touch-action: none` pattern already running in `outline-viewer.tsx` and `rocker-viewer.tsx`. No gesture library, and no duplicate mouse handlers added beside the pointer handlers.
- A phone layout that "works" by hiding a control is a regression, not a fix.
- Station spacing on the outline, rocker and foil curves is measured during planning, before a new hit-zone radius is chosen — today's 15px radius gives a 30px target, under the 44px guideline.

### Phase 10: The Whole App on a Phone

**Goal**: Everything around the design screens works on a phone too, and the whole trip — sign in, pick a board, shape it, save it, read the summary — is proven in a shaper's hand on real phones.
**Depends on**: Phase 9
**Requirements**: PHON-07, PHON-08, PHON-09, PHON-10
**Success Criteria** (what must be TRUE):

  1. A shaper can sign in, sign up and use the account menu on a phone.
  2. A shaper can pick a preset and open, rename, duplicate or delete a saved board from the rack, on a phone.
  3. A shaper can read the summary and the on-screen order form on a phone; printing stays a desktop job.
  4. The whole trip — sign in, pick a preset, open from the rack, work through all five design screens, save, read the summary — runs end to end on a real iPhone and a real Android phone, with desktop mouse and keyboard behaviour unchanged.

**Plans**: TBD
**UI hint**: yes

**Settled findings that constrain this phase:**

- **End-to-end verification is on real devices, in hand.** DevTools emulation misses the iOS long-press callout, sticky hover and the toolbar coming and going, which are exactly the failures this phase exists to catch.
- The sweep sits last on purpose, so it exercises Phase 8's new rails surfaces on a phone as well as the screens retrofitted in Phase 9.
- Safe-area handling is needed wherever a control ends up bottom-anchored; which screens those are gets enumerated during planning, once phone control placement is known.
- The work is breadth on well-trodden patterns — Clerk's prebuilt sign-in UI, shadcn cards, Tailwind breakpoints — so a research-phase can be skipped.

## Progress

**Execution Order:**
Phases execute in numeric order: 1 → 2 → 3 → 4 (v1.0, complete) → 5 → 6 → 7 (v1.1, complete) → 8 → 9 → 10 (v1.2)

| Phase | Plans Complete | Status | Completed |
|-------|----------------|--------|-----------|
| 1. Foundation — Port & Deploy the Design Tool | 4/4 | Complete    | 2026-08-21 |
| 2. Accounts & Saved Designs | 6/6 | Complete    | 2026-08-28 |
| 3. Volume, Templates & Verified Math | 7/7 | Complete    | 2026-08-28 |
| 4. Rocker & Foil Editors | 5/5 | Complete    | 2026-08-29 |
| 5. The Units Chooser | 7/7 | Complete    | 2026-09-05 |
| 6. The Design Screens in Metric | 9/9 | Complete    | 2026-09-05 |
| 7. Metric on Paper | 5/5 | Complete    | 2026-09-06 |
| 8. The Rails Screen, Finished | 4/6 | In Progress|  |
| 9. The Design Screens on a Phone | 0/TBD | Not started | - |
| 10. The Whole App on a Phone | 0/TBD | Not started | - |
