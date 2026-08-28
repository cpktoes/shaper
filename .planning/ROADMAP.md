# Roadmap: Shaper

## Overview

Shaper starts from a working prototype (built in Claude Design) that already proves out the two "secret sauce" calculators — rail band and fin placement — but lives outside the codebase as a single self-contained page. The journey: port that prototype into a real Next.js app and get it live with accounts and saving (M1), prove the geometry math is trustworthy and extend it to volume and printable templates (M2), then build out the remaining shaper-facing editors — rocker and foil — as first-class interactive tools (M3). By the end of Phase 4, a shaper can log in, shape a full board design (outline, rocker, rail, foil, fins), see live-calculated rail band dimensions, fin placement, and volume, save it as a named model, and print a full-size template to cut foam from.

## Phases

**Phase Numbering:**

- Integer phases (1, 2, 3): Planned milestone work
- Decimal phases (2.1, 2.2): Urgent insertions (marked with INSERTED)

Decimal phases appear between their surrounding integers in numeric order.

- [x] **Phase 1: Foundation — Port & Deploy the Design Tool** - Port the Claude Design prototype into a real Next.js app, live on Vercel, with outline shaping, rail-band calc, and fin-placement calc working (completed 2026-08-21)
- [x] **Phase 2: Accounts & Saved Designs** - Users sign up/log in via Clerk and their designs persist in Neon Postgres across sessions (completed 2026-08-28)
- [ ] **Phase 3: Volume, Templates & Verified Math** - Live volume calculation, printable full-size templates, and automated tests proving the geometry math correct
- [ ] **Phase 4: Rocker & Foil Editors** - Interactive rocker and foil editors complete the design surface, feeding rail band and volume live

## Phase Details

### Phase 1: Foundation — Port & Deploy the Design Tool

**Goal**: The ported prototype runs as a real Next.js/TypeScript/Tailwind v4/shadcn app, live on Vercel, letting a user set dimensions, shape an outline, and see rail-band and fin-placement numbers calculated from real formulas — with that math implemented as pure TypeScript functions under `lib/`, per the project's geometry constraint.
**Mode:** mvp
**Depends on**: Nothing (first phase)
**Requirements**: SETUP-01, OUTL-01, RAIL-01, FIN-01, FIN-02, FIN-03, VIZ-01, UNIT-01
**Success Criteria** (what must be TRUE):

  1. User can enter overall board dimensions (length, width, thickness) in inches and start a new design
  2. User can shape an outline curve constrained to those dimensions and view it rendered in a 2D view
  3. User can select a fin configuration (single, thruster, quad, twin/2+1) and view the calculated fin placement (position, angle, toe) overlaid on the outline
  4. User can view calculated rail band dimensions (thickness/apex/tuck) at stations along the board, derived from the outline
  5. The app is live at a public Vercel URL, ported from the `reference/` prototype, with all measurements displayed in inches and litres

**Plans**: 4/4 plans executed

Plans:
**Wave 1**

- [x] 01-01-PLAN.md — Tracer: preset → outline editor end-to-end, board store promoted to the root layout

**Wave 2** *(blocked on Wave 1 completion)*

- [x] 01-02-PLAN.md — Setup screen per the approved UI contract: preset cards with real outline thumbnails, continue-board card, replace confirm dialog
- [x] 01-03-PLAN.md — First Vercel production deployment, auto-deploying from `main`

**Wave 3** *(blocked on Wave 2 completion)*

- [x] 01-04-PLAN.md — Live preset tuning capture (D-03) and the phase acceptance walkthrough

**UI hint**: yes

### Phase 2: Accounts & Saved Designs

**Goal**: Users have their own account and their designs persist across sessions, completing the "live + saving" milestone.
**Mode:** mvp
**Depends on**: Phase 1
**Requirements**: ACCT-01, ACCT-02, ACCT-03, MODL-01, MODL-02, MODL-03
**Success Criteria** (what must be TRUE):

  1. User can sign up with email and password and log in, staying logged in across browser sessions
  2. User can reset a forgotten password via an emailed link
  3. User can save the current design as a named model tied to their account (persisted in Neon Postgres via Drizzle)
  4. User can reopen a previously saved model and continue editing it
  5. User can view a list of all their saved models

**Plans:** 6/6 plans complete

Plans:
**Wave 1**

- [x] 02-01-PLAN.md — Tracer: sign in, save this board, and find it again — Clerk mounted, the models table live in Neon, and one board saved and reopened end to end

**Wave 2** *(blocked on Wave 1 completion)*

- [x] 02-02-PLAN.md — Autosave after the first save, the nav's four save states, and Save while signed out (D-08)
- [x] 02-03-PLAN.md — The board rack complete: in-progress card first, stable last-touched ordering, and the failure behaviours (D-06, D-07, D-12)

**Wave 3** *(blocked on Wave 2 completion)*

- [x] 02-04-PLAN.md — Rename, Duplicate and Delete on each rack card, each scoped to its owner (D-13)
- [x] 02-05-PLAN.md — The sign-in banner (D-02) and the sweep that retires every stale promise about saving

**Wave 4** *(blocked on Wave 3 completion)*

- [x] 02-06-PLAN.md — Production Clerk instance, Google credentials, the migrated production database, and the live acceptance walkthrough

**UI hint**: yes

### Phase 3: Volume, Templates & Verified Math

**Goal**: The core geometry math is proven correct by automated tests, board volume updates live as the design changes, and users can print a full-size template to cut foam from — completing the "the math is right" milestone.
**Mode:** mvp
**Depends on**: Phase 1
**Requirements**: VOL-01, TMPL-01
**Success Criteria** (what must be TRUE):

  1. Board volume (in litres) recalculates live as the user adjusts the outline or rocker
  2. Core geometry calculations (outline, rocker, rail band, volume) in `lib/` are covered by Vitest unit tests that pass in CI, validating RAIL-01 and VOL-01 output against known-good values
  3. User can export a full-size (1:1 scale) printable template of the outline, tiled across standard pages for taping together

**Plans**: 4/7 plans executed

Plans:
**Wave 1**

- [x] 03-01-PLAN.md — Tracer: outline to a downloaded, true-1:1 tiled PDF from the Template screen, confirmed with a ruler
- [x] 03-02-PLAN.md — The geometry suites run on GitHub for every push, and the three derivations feeding the litres figure get tested directly

**Wave 2** *(blocked on Wave 1 completion)*

- [x] 03-03-PLAN.md — The finished printed template: the four working marks, the name block, match marks and the how-to box (D-06 to D-10)
- [x] 03-04-PLAN.md — Preview-first export dialog with the Letter/A4 pick, on both the Template and Summary screens (D-02, D-03, D-04)

**Wave 3** *(blocked on Wave 2 completion)*

- [ ] 03-05-PLAN.md — Template screen toolbar: construction-lines toggle and wide view (folded todo)
- [ ] 03-06-PLAN.md — Verify and refit the Summary order form's print path after the callout-system rebuild (folded todo)

**Wave 4** *(blocked on Wave 3 completion)*

- [ ] 03-07-PLAN.md — CI green on GitHub, the phase acceptance walkthrough, and the three resolved todos archived

**UI hint**: yes

### Phase 4: Rocker & Foil Editors

**Goal**: Users can shape a rocker curve and a foil profile as first-class, interactive parts of the design, with rail band and volume recalculating live as they adjust either — completing the "shaper features" milestone's editor work.
**Mode:** mvp
**Depends on**: Phase 1, Phase 3
**Requirements**: ROCK-01, FOIL-01
**Success Criteria** (what must be TRUE):

  1. User can define a rocker curve (nose and tail rocker profile) and view the rail band and 2D visualization update live as they adjust it
  2. User can define a foil (thickness distribution along the length of the board) and view the live volume figure update as they adjust it
  3. Rocker and foil inputs are saved and restored correctly when a model is saved and reopened

**Plans**: TBD
**UI hint**: yes

## Progress

**Execution Order:**
Phases execute in numeric order: 1 → 2 → 3 → 4

| Phase | Plans Complete | Status | Completed |
|-------|----------------|--------|-----------|
| 1. Foundation — Port & Deploy the Design Tool | 4/4 | Complete    | 2026-08-21 |
| 2. Accounts & Saved Designs | 6/6 | Complete    | 2026-08-28 |
| 3. Volume, Templates & Verified Math | 4/7 | In Progress|  |
| 4. Rocker & Foil Editors | 0/TBD | Not started | - |
