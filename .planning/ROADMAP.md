# Roadmap: Shaper

## Overview

Shaper started from a working prototype (built in Claude Design) that already proved out the two "secret sauce" calculators — rail band and fin placement — but lived outside the codebase as a single self-contained page. **Milestone v1.0 (Phases 1–4, complete 2026-08-29)** ported that prototype into a real Next.js app and got it live with accounts and saving, proved the geometry math trustworthy and extended it to volume and printable templates, then built the rocker and foil editors as first-class interactive tools. A shaper can now log in, shape a full board design (outline, rocker, rail, foil, fins), see live-calculated rail band dimensions, fin placement and volume, save it as a named model, and print a full-size template to cut foam from — all of it in inches and litres.

**Milestone v1.1 (Phases 5–7, current)** gives the shaper a choice. Every board is already stored in millimetres, so this is presentation work: a units chooser in the settings menu, one set of metric formatters and parsers beside the imperial ones in `lib/geometry/units.ts`, and then every place a number is shown — roughly 300 of them across about 25 files — reading the shaper's chosen system instead of assuming inches. It lands in three passes a shaper can see and try one at a time: the chooser itself proving out on the setup screen, then the five design screens, then everything that comes out of a printer.

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

**Milestone v1.1 — Imperial vs Metric (current)**

- [ ] **Phase 5: The Units Chooser** - Imperial/Metric picker in the settings menu, saved on the account and remembered per browser, proving itself on the setup screen's preset and rack cards
- [ ] **Phase 6: The Design Screens in Metric** - Every slider, typed field, viewer callout and data table on the five design screens reads and accepts the chosen system
- [ ] **Phase 7: Metric on Paper** - The order form, Overview Sheet, Full Sized Template and Paper Saver all print in the chosen system, with 1:1 scale still true

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

**Milestone v1.1 — Imperial vs Metric** starts here.

### Phase 5: The Units Chooser

**Goal**: A shaper picks Imperial or Metric from the settings menu, that choice follows them across devices when signed in and sticks to the browser when signed out, and the setup screen's preset cards and rack cards immediately read in the system they picked — proving the whole chain from the chooser, through one shared preference, into `lib/geometry/units.ts` and out to a label.
**Depends on**: Nothing new (builds on the shipped v1.0 app)
**Requirements**: UNIT-02, UNIT-03, UNIT-04, UNIT-05, SCRN-04, RACK-01
**Success Criteria** (what must be TRUE):

  1. A shaper opens the gear menu in the top bar and finds an Imperial / Metric chooser sitting beside the theme chooser; until they touch it, everyone sees Imperial exactly as they do today
  2. Choosing Metric immediately re-labels every preset card and every board on the rack — a 6'2" × 20 1/4" board reads 188 × 51.4 cm — and choosing Imperial puts them straight back
  3. Signed in, the choice is waiting on any other browser or device the shaper signs in from; signed out, that browser remembers it on its own, and signing in either adopts the account's saved choice or promotes the browser's when the account has none
  4. Switching to Metric and back leaves every saved board untouched — the same dimensions, down to the same sixteenth — and nothing in the rack has been rewritten

**Plans**: 1/7 plans executed
**Wave 1**

  - [x] 05-01-PLAN.md — Tracer: the gear-menu chooser through one shared preference into `units.ts` and out to a rack card label, server-rendered from the first paint

**Wave 2** *(blocked on Wave 1 completion)*

  - [ ] 05-02-PLAN.md — The account home: a nullable per-user units column, its migration, the auth-first write, and the sign-in handoff
  - [ ] 05-03-PLAN.md — One shared card line, and preset cards gain their dimensions line
  - [ ] 05-04-PLAN.md — The whole-millimetre family and the metric parser, the UNIT-05 isolation guard, and the CLAUDE.md Rule 2 rewrite

**Wave 3** *(blocked on Wave 2 completion)*

  - [ ] 05-05-PLAN.md — Folded todo: one shared slider row across all five control sidebars
  - [ ] 05-06-PLAN.md — Folded todo: one shared viewer toolbar button across the TEMPLATE and ROCKER screens

**Wave 4** *(blocked on Wave 3 completion)*

  - [ ] 05-07-PLAN.md — Ship it: push, let Vercel deploy, then migrate production, and check the whole chain live

**Phase notes**:

  - Rule 1 applies: the metric side of the number rules (cm and whole-mm formatting, decimal-cm and whole-mm parsing, rounding, and the round-trip guarantee behind UNIT-05) is added to `lib/geometry/units.ts` beside the existing imperial functions, pure and unit-tested. Components read the chosen system through one hook/context rather than each converting on its own.
  - UNIT-03 needs a new account-level column via Drizzle. CLAUDE.md's database rule applies without exception: push to `main`, let Vercel finish deploying, and only then run `npm run db:migrate:prod`.
  - UNIT-04's per-browser fallback mirrors how the theme preference already works (`lib/theme.ts` + localStorage), including the pre-hydration read.
  - This is the first phase to ship a Metric display, so CLAUDE.md Rule 2 ("inches and litres on screen") is rewritten here — the project rules must never claim the app is inches-only once it isn't.

**UI hint**: yes

### Phase 6: The Design Screens in Metric

**Goal**: Every measurement a shaper reads or types while shaping — on the outline, rails, fins, rocker and volume screens — follows the system they chose, with cm for length and widths, whole millimetres for the small stuff, and litres for volume either way.
**Depends on**: Phase 5
**Requirements**: SCRN-01, SCRN-02, SCRN-03, SCRN-05
**Success Criteria** (what must be TRUE):

  1. In Metric, every slider and value on the outline, rails, fins, rocker and volume screens reads in cm for length and widths and whole millimetres for rail band marks, rocker heights and foil thickness — and the sliders land on whole millimetres rather than between them
  2. In Metric, a shaper can type a decimal centimetre figure (51.4) or whole millimetres and the field accepts it, re-prints it in the chosen system, and reverts anything unreadable exactly as it does today
  3. Viewer callouts and data tables follow too — rail band marks, fin placement numbers, the rocker datasheet and the volume card all read in the chosen system, with no stray inch marks left behind
  4. Volume reads in litres in both systems, and the same litres figure is quoted on every screen as it is now
  5. A shaper can flip between systems mid-design and the board itself never moves — the outline, rocker and foil are exactly where they left them

**Plans**: TBD
**Phase notes**:

  - This is the bulk of the roughly 300 display sites across about 25 component files. No component gets its own conversion: each reads the chosen system from the Phase 5 hook and calls `lib/geometry/units.ts`.
  - Typed entry today goes through the imperial parser (`components/rocker/imperial-field.tsx` and the controls that use `parseImperial`); the metric parser is its counterpart, not a second code path inside components.

**UI hint**: yes

### Phase 7: Metric on Paper

**Goal**: Everything a shaper prints comes out in the system they chose — the Summary order form, the Overview Sheet, the Full Sized Template and the Paper Saver — while the 1:1 templates still measure dead true against a ruler.
**Depends on**: Phase 5 (executes after Phase 6)
**Requirements**: PRNT-01, PRNT-02, PRNT-03, PRNT-04
**Success Criteria** (what must be TRUE):

  1. The Summary order form prints every measurement in the chosen system, so a shaper handing it over reads the same numbers they designed with
  2. The Overview Sheet PDF prints in the chosen system, dims block and all
  3. The Full Sized Template and Paper Saver print their marks, labels and name/dims block in the chosen system
  4. In Metric, the printed scale-check square is captioned in millimetres, so a metric ruler alone can confirm the print came out at true 1:1
  5. Nothing on paper moved: a template printed after this phase measures the same on the bench as one printed before it, and the frozen characterisation pins in `lib/geometry/template.test.ts` are still green

**Plans**: TBD
**Phase notes**:

  - PRNT-04 carries one open question — whether the scale-check square stays a 2in square with a millimetre caption or becomes a 50 mm square in Metric. That is settled in this phase's discussion step, not in the roadmap, because it decides whether any printed geometry changes at all.
  - Three separate jsPDF builders are in scope (`components/template/build-template-pdf.ts`, `build-strip-pdf.ts`, `build-overview-pdf.ts`) plus the Summary order form. A units change is a change to what the labels *say*; if the frozen template pins go red, the change went further than it should have.

## Progress

**Execution Order:**
Phases execute in numeric order: 1 → 2 → 3 → 4 (v1.0, complete) → 5 → 6 → 7 (v1.1)

| Phase | Plans Complete | Status | Completed |
|-------|----------------|--------|-----------|
| 1. Foundation — Port & Deploy the Design Tool | 4/4 | Complete    | 2026-08-21 |
| 2. Accounts & Saved Designs | 6/6 | Complete    | 2026-08-28 |
| 3. Volume, Templates & Verified Math | 7/7 | Complete    | 2026-08-28 |
| 4. Rocker & Foil Editors | 5/5 | Complete    | 2026-08-29 |
| 5. The Units Chooser | 1/7 | In Progress|  |
| 6. The Design Screens in Metric | 0/? | Not started | - |
| 7. Metric on Paper | 0/? | Not started | - |
