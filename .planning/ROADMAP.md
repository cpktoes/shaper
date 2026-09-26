# Roadmap: Shaper

## Overview

Shaper started from a working prototype (built in Claude Design) that already proved out the two "secret sauce" calculators — rail band and fin placement — but lived outside the codebase as a single self-contained page. **Milestone v1.0 (Phases 1–4, complete 2026-08-29)** ported that prototype into a real Next.js app and got it live with accounts and saving, proved the geometry math trustworthy and extended it to volume and printable templates, then built the rocker and foil editors as first-class interactive tools. A shaper can now log in, shape a full board design (outline, rocker, rail, foil, fins), see live-calculated rail band dimensions, fin placement and volume, save it as a named model, and print a full-size template to cut foam from — all of it in inches and litres.

**Milestone v1.1 (Phases 5–7, complete 2026-09-06)** gives the shaper a choice. Every board is already stored in millimetres, so this is presentation work: a units chooser in the settings menu, one set of metric formatters and parsers beside the imperial ones in `lib/geometry/units.ts`, and then every place a number is shown — roughly 300 of them across about 25 files — reading the shaper's chosen system instead of assuming inches. It lands in three passes a shaper can see and try one at a time: the chooser itself proving out on the setup screen, then the five design screens, then everything that comes out of a printer.

**Milestone v1.2 (Phases 8–10, complete 2026-09-12)** finishes what the prototype started and takes the app off the desk. The rails screen has always been missing its third tab — the INSTRUCTIONS page that names every mark on a rail cross-section and lets a shaper flip the example between Flat and Domed — along with a 1:1 on-screen view to hold against the foam, a plan and side reference showing where each section sits on the board, and an option to fold that instructions sheet into what gets printed. None of it needs new geometry: the prototype's `halveDeckMark1` flag turned out to be dead code, so the rail-band calculator already in `lib/` draws the example rail exactly as the reference did. The second half is phone work, and it is not polish — the five design screens carry zero responsive breakpoints today, so the phone layout is built from scratch and touch-first: one shared screen shell instead of five copies of the same sidebar-and-canvas layout, drawings that fill the screen, and drag handles on the outline, rocker and foil curves sized for a thumb. It lands in three passes: rails first (the smaller, self-contained port), then the design screens on a phone (where touch drag lives), then everything around them — sign-in, presets, the rack and the summary — walked end to end on a real iPhone and a real Android phone.

## Milestones

- ✅ **v1.0 — the design tool, in inches** — Phases 1–4 (shipped 2026-08-29)
- ✅ **v1.1 — Imperial vs Metric** — Phases 5–7 (shipped 2026-09-06)
- ✅ **v1.2 — Rails Finished, Phone Ready** — Phases 8–10 (shipped 2026-09-12)
- 🚧 **v1.3 — Rocker from Real Blanks** — Phase 11 (opened 2026-09-25 on branch `rocker-blanks`; context gathered, not yet planned)

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

**Milestone v1.2 — Rails Finished, Phone Ready (complete)**

- [x] **Phase 8: The Rails Screen, Finished** - The INSTRUCTIONS tab with its named example rail and Flat/Domed toggle, "View Full Sized" at 1:1, the plan and side reference view, and an option to fold the instructions sheet into what gets printed (completed 2026-09-08)
- [x] **Phase 9: The Design Screens on a Phone** - One shared screen shell stacks the five design screens for a narrow screen, with finger-sized controls and outline, rocker and foil points a thumb can drag (completed 2026-09-09)
- [x] **Phase 10: The Whole App on a Phone** - Sign-in, presets, the rack and the summary reflowed and touch-sized, with the whole trip walked end to end on real phones (completed 2026-09-12)

**Milestone v1.3 — Rocker from Real Blanks (in progress)**

- [ ] **Phase 11: Rocker from Real Blanks** - The ROCKER screen sets rocker, thickness and foil from a real blank the shaper picks and slides the board along, with the fit checked at every point, the four rocker numbers live and every blank that won't fit shown with why; blank data seeded from the three vendor catalogues

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

### Milestone v1.2: Rails Finished, Phone Ready (Phases 8–10, complete 2026-09-12)

Shipped — 29 plans across 3 phases. The rails screen got the third tab the prototype always
promised (INSTRUCTIONS, Flat/Domed, View Full Sized at 1:1, a plan/side reference, the sheet folded
into the printed order form), and the whole app — sign-in, the rack, all five design screens,
saving, the summary — works in a shaper's hand on a real phone, with a desktop mouse seeing nothing
change. PHON-10 closed on a real iPhone alone; the Android walk was skipped by the founder's own
decision (D-12) and is recorded as such. Full phase detail archived in
[`.planning/milestones/v1.2-ROADMAP.md`](milestones/v1.2-ROADMAP.md); requirements in
[`.planning/milestones/v1.2-REQUIREMENTS.md`](milestones/v1.2-REQUIREMENTS.md); audit in
[`.planning/milestones/v1.2-MILESTONE-AUDIT.md`](milestones/v1.2-MILESTONE-AUDIT.md); phase
artifacts in [`.planning/milestones/v1.2-phases/`](milestones/v1.2-phases/).

### Milestone v1.3: Rocker from Real Blanks (Phase 11, in progress)

Opened 2026-09-25 on branch `rocker-blanks` from the founder's written brief, which is locked as the phase's spec. The ROCKER screen stops being a hand-drawn curve: a shaper sets a target centre thickness, picks a real blank that fits from the US Blanks, Arctic Foam and Marko Foam catalogues (162 blanks seeded from `db/seed/blanks/`), slides the board along it, and the board's rocker, thickness and foil are read off where it sits in that foam. Requirements and decisions live in the phase directory; nothing lands on `main` until the founder approves the plan.

### Phase 11: Rocker from Real Blanks

**Goal:** A shaper sets a target centre thickness, picks a real blank that fits, slides the board along it, and the board's rocker, thickness and foil are read off where it sits in that foam — the four rocker numbers and the foam to remove shown live, every blank that won't fit shown with why, and a foil that matches the shaper's centre and tip thicknesses; the four named geometry tests land before any UI.
**Requirements**: locked in `.planning/phases/11-rocker-from-real-blanks/11-SPEC.md` (16 requirements); decisions in `11-CONTEXT.md` (D-01–D-20)
**Depends on:** Phase 10
**Success criteria:** the brief's DONE WHEN — pick a blank, slide the board along it, watch the four rocker numbers change live, see which blanks don't fit and why, and get a foil that matches the centre and tip thicknesses — plus the four named tests green before the UI, the seed re-runnable, and every older saved board reopening
**Plans:** 13 plans in 7 waves

Plans:

**Wave 1**
- [ ] 11-01-PLAN.md — The blank maths, proven against the catalogues first: pchip, the catalogue reader, levelling, the board sitting on the blank, the scaled foil and the fit check — with the brief's four named tests (R3 R4 R7 R8 R9 R10 R11 R12 R13 R14 R16)
- [ ] 11-02-PLAN.md — Two building blocks: a signed "+1/16"" figure for fine-tunes, and the storage rules for the five fit and tip defaults (R2 R5 R15)

**Wave 2** *(blocked on Wave 1 completion)*
- [ ] 11-03-PLAN.md — Judge every blank for a board (fits, won't fit and why, where the slider lands, the closest blank that fits) and word the reasons in inches and millimetres (R2 R6 R12 R15)
- [ ] 11-04-PLAN.md — One side profile every screen reads; the hand-set five-station rocker; the foil moves onto pchip (litres move by a hair) (R4 R5 R10 R13 R14)
- [ ] 11-05-PLAN.md — The blank catalogue in the database: table, migration, a read that can't break the page, and a re-runnable seed of all 162 blanks (R7 R8 R9)

**Wave 3** *(blocked on Wave 2 completion)*
- [ ] 11-06-PLAN.md — The five fit and tip defaults saved on the account: columns, migration, server read, one save action (R2 R5 R12)
- [ ] 11-07-PLAN.md — The drawing: the board inside its blank with the foam shaded, measuring points, nothing to drag; the old drag code and old spline retired (R4 R15)

**Wave 4** *(blocked on Wave 3 completion)*
- [ ] 11-08-PLAN.md — "Fit & Tip Defaults" in the gear menu, on desktop and phone (R2 R5 R15)
- [ ] 11-09-PLAN.md — Saved boards move to version 4 (the blank travels with the board); the store learns about blanks; four hand-set rocker sliders; the DATASHEET shows the blank beside the board (R1 R4 R5 R6 R14)

**Wave 5** *(blocked on Wave 4 completion)*
- [ ] 11-10-PLAN.md — How a new board starts: presets open in real (provisional) blanks, an untouched board follows the tip defaults, and every litres figure agrees (R5 R13 R14)
- [ ] 11-11-PLAN.md — The ROCKER sidebar in the brief's order: centre thickness, the blank list and search, the flag and the offer, the placement slider with live numbers, tips and the 12" fine-tune (R1 R2 R3 R4 R5 R6 R12 R14 R15)

**Wave 6** *(blocked on Wave 5 completion)*
- [ ] 11-12-PLAN.md — Browser proof on both phones and the desktop (no network requests while sliding), then the ROCKER and VOLUME screenshots re-recorded once (R3 R4 R6 R14 R15 R16)

**Wave 7** *(blocked on Wave 6 completion — a founder step after the merge is live)*
- [ ] 11-13-PLAN.md — After the merge is live on Vercel: migrate production and load the blanks (a founder checkpoint) (R7 R8 R9)

Cross-cutting constraints: geometry pure and tested under `lib/geometry/` before any screen changes (R16); every conversion through `lib/geometry/units.ts` and every displayed number through `measure-display.ts` (R15); no new dependency and no package.json change (D-20); development-branch migrations inside the plans, production only after the deploy (CLAUDE.md Database); the ROCKER and VOLUME desktop baselines re-recorded once in 11-12, TEMPLATE/RAILS/FINS byte-identical.

---

## Progress

**Execution Order:**
Phases execute in numeric order: 1 → 2 → 3 → 4 (v1.0, complete) → 5 → 6 → 7 (v1.1, complete) → 8 → 9 → 10 (v1.2, complete) → 11 (v1.3, in progress)

| Phase | Plans Complete | Status | Completed |
|-------|----------------|--------|-----------|
| 1. Foundation — Port & Deploy the Design Tool | 4/4 | Complete    | 2026-08-21 |
| 2. Accounts & Saved Designs | 6/6 | Complete    | 2026-08-28 |
| 3. Volume, Templates & Verified Math | 7/7 | Complete    | 2026-08-28 |
| 4. Rocker & Foil Editors | 5/5 | Complete    | 2026-08-29 |
| 5. The Units Chooser | 7/7 | Complete    | 2026-09-05 |
| 6. The Design Screens in Metric | 9/9 | Complete    | 2026-09-05 |
| 7. Metric on Paper | 5/5 | Complete    | 2026-09-06 |
| 8. The Rails Screen, Finished | 9/9 | Complete    | 2026-09-08 |
| 9. The Design Screens on a Phone | 9/9 | Complete    | 2026-09-09 |
| 10. The Whole App on a Phone | 11/11 | Complete    | 2026-09-12 |
| 11. Rocker from Real Blanks | 0/13 | Planned | — |
