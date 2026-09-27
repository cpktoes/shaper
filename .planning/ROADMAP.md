# Roadmap: Shaper

## Overview

Shaper started from a working prototype (built in Claude Design) that already proved out the two "secret sauce" calculators — rail band and fin placement — but lived outside the codebase as a single self-contained page. **Milestone v1.0 (Phases 1–4, complete 2026-08-29)** ported that prototype into a real Next.js app and got it live with accounts and saving, proved the geometry math trustworthy and extended it to volume and printable templates, then built the rocker and foil editors as first-class interactive tools. A shaper can now log in, shape a full board design (outline, rocker, rail, foil, fins), see live-calculated rail band dimensions, fin placement and volume, save it as a named model, and print a full-size template to cut foam from — all of it in inches and litres.

**Milestone v1.1 (Phases 5–7, complete 2026-09-06)** gives the shaper a choice. Every board is already stored in millimetres, so this is presentation work: a units chooser in the settings menu, one set of metric formatters and parsers beside the imperial ones in `lib/geometry/units.ts`, and then every place a number is shown — roughly 300 of them across about 25 files — reading the shaper's chosen system instead of assuming inches. It lands in three passes a shaper can see and try one at a time: the chooser itself proving out on the setup screen, then the five design screens, then everything that comes out of a printer.

**Milestone v1.2 (Phases 8–10, complete 2026-09-12)** finishes what the prototype started and takes the app off the desk. The rails screen has always been missing its third tab — the INSTRUCTIONS page that names every mark on a rail cross-section and lets a shaper flip the example between Flat and Domed — along with a 1:1 on-screen view to hold against the foam, a plan and side reference showing where each section sits on the board, and an option to fold that instructions sheet into what gets printed. None of it needs new geometry: the prototype's `halveDeckMark1` flag turned out to be dead code, so the rail-band calculator already in `lib/` draws the example rail exactly as the reference did. The second half is phone work, and it is not polish — the five design screens carry zero responsive breakpoints today, so the phone layout is built from scratch and touch-first: one shared screen shell instead of five copies of the same sidebar-and-canvas layout, drawings that fill the screen, and drag handles on the outline, rocker and foil curves sized for a thumb. It lands in three passes: rails first (the smaller, self-contained port), then the design screens on a phone (where touch drag lives), then everything around them — sign-in, presets, the rack and the summary — walked end to end on a real iPhone and a real Android phone.

**Milestone v1.3 (Phase 11, complete 2026-09-26)** takes the rocker off the drawing board and puts it in real foam. The ROCKER screen stopped being a hand-drawn curve: a shaper sets a target centre thickness, picks a real blank that fits from the US Blanks, Arctic Foam and Marko Foam catalogues (162 blanks seeded from `db/seed/blanks/`, 158 pickable), slides the board along it, and the board's rocker, thickness and foil are read off where it sits in that foam — the four rocker numbers and the foam to remove live, every blank that won't fit listed with why, five Fit & Tip Defaults on the account, and older saved boards reopening hand-set. One phase of thirteen plans, planned, executed, reviewed, verified, walked by the founder and shipped to production in a day and a half.

**Milestone v1.4 (Phase 12, opened 2026-09-26)** models the foil the way a shaper actually cuts it. Phase 11 scales the blank's thickness profile down to the centre thickness; a shaper does something else with a planer: skins the deck by a roughly constant amount, planes the bottom down to thickness, and only then thins the tips. The founder's brief puts that on the screen — a deck skin taken off parallel to the blank's deck, the bottom planed down to centre thickness with the foam to remove shown as planer passes, a bottom curve parallel to the blank's rocker, and tip thinning in the last 12" with a pin-deck or bottom choice — so the DATASHEET's numbers become the numbers a shaper works to. Opened for discussion on branch `foil-real-shaping`; nothing lands on `main` until the founder approves the plan.

## Milestones

- ✅ **v1.0 — the design tool, in inches** — Phases 1–4 (shipped 2026-08-29)
- ✅ **v1.1 — Imperial vs Metric** — Phases 5–7 (shipped 2026-09-06)
- ✅ **v1.2 — Rails Finished, Phone Ready** — Phases 8–10 (shipped 2026-09-12)
- ✅ **v1.3 — Rocker from Real Blanks** — Phase 11 (shipped 2026-09-26)
- 🚧 **v1.4 — Foil the Way a Shaper Cuts It** — Phase 12 (opened 2026-09-26 on branch `foil-real-shaping`; planned the same day, 10 plans in 5 waves, awaiting the founder's approval)

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

**Milestone v1.3 — Rocker from Real Blanks (complete)**

- [x] **Phase 11: Rocker from Real Blanks** - The ROCKER screen sets rocker, thickness and foil from a real blank the shaper picks and slides the board along, with the fit checked at every point, the four rocker numbers live and every blank that won't fit shown with why; blank data seeded from the three vendor catalogues (completed 2026-09-26)

**Milestone v1.4 — Foil the Way a Shaper Cuts It (in progress)**

- [ ] **Phase 12: Foil the Way a Shaper Cuts It** - The foil modelled the way foam actually comes off: a deck skin taken off parallel to the blank's deck, the bottom planed down to centre thickness with the foam to remove shown as planer passes, a bottom curve parallel to the blank's rocker, and tip thinning in the last 12" with a pin-deck or bottom choice — the 12" stations still fine-tunable

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

### Milestone v1.3: Rocker from Real Blanks (Phase 11, complete 2026-09-26)

Shipped — 13 plans in one phase, in a day and a half on branch `rocker-blanks` (merged to `main` as
2d05668). The ROCKER screen stopped being a hand-drawn curve: a shaper sets a target centre thickness,
picks a real blank that fits from the US Blanks, Arctic Foam and Marko Foam catalogues (162 blanks
seeded, 158 pickable), slides the board along it, and reads the board's rocker, thickness and foil off
where it sits in that foam, with every blank that won't fit listed with why and five Fit & Tip Defaults
on the account. Production was migrated and seeded BEFORE the deploy under the amended expand-first
database rule. No milestone audit was run; the phase closed on its own verification (16/16, 0 gaps),
UAT (7/7 with the founder), security (43/43) and six live checks. Full phase detail archived in
[`.planning/milestones/v1.3-ROADMAP.md`](milestones/v1.3-ROADMAP.md); requirements in
[`.planning/milestones/v1.3-REQUIREMENTS.md`](milestones/v1.3-REQUIREMENTS.md); phase artifacts in
[`.planning/milestones/v1.3-phases/`](milestones/v1.3-phases/).

### Milestone v1.4: Foil the Way a Shaper Cuts It (Phase 12, in progress)

Opened 2026-09-26 on branch `foil-real-shaping`, the same day v1.3 shipped, from the founder's own brief captured verbatim in [`.planning/todos/pending/2026-09-26-foil-the-way-a-shaper-cuts-it-deck-skin-parallel-bottom-pin-deck-tips.md`](.planning/todos/pending/2026-09-26-foil-the-way-a-shaper-cuts-it-deck-skin-parallel-bottom-pin-deck-tips.md). It changes the foil calculator that shapers cut to, so it is a phase with the tests-before-UI discipline of Phase 11, not a quick task. Requirements and decisions are gathered by `/gsd-discuss-phase 12` and locked in the phase directory; nothing lands on `main` until the founder approves the plan.

### Phase 12: Foil the Way a Shaper Cuts It

**Goal:** A shaper's board is cut from its blank the way a planer actually works: a constant deck skin comes off first, parallel to the blank's deck; the centre thickness sets the board's bottom under that deck, and the gap down to the blank's bottom reads as the foam to remove and as planer passes; the board's bottom parallels the blank's rocker so the four rocker numbers are the blank's own and each 12" station's thickness falls out of it; the tips are thinned last, only inside the last 12", with the deck pinned (default, the bottom rises and tip rocker grows) or the bottom pinned (the deck drops) — the curve through the 12" stations fixed before thinning and still nudged by the fine-tune adjusters. Every printed number stays a number a shaper would cut to, and every board saved under the Phase 11 model still opens.
**Requirements**: R1–R11 locked in `.planning/phases/12-foil-the-way-a-shaper-cuts-it/12-SPEC.md` (six from the founder's brief, five carried constraints); decisions D-01–D-20 in `12-CONTEXT.md`; UI contract in `12-UI-SPEC.md`
**Depends on:** Phase 11
**Plans:** 10 plans in 5 waves

Plans:

**Wave 1**

- [ ] 12-01-PLAN.md — Pin Phase 11's foil in a golden file, then cut the board from its blank the way a planer does (deck skin, bottom gap, eased tips) and carry older boards across — all six named geometry tests before any screen changes (R1 R2 R3 R4 R5 R6 R7 R9 R10 R11)
- [ ] 12-02-PLAN.md — Add the three new settings columns to the development database with a read-only proof, and teach the app to count planer passes from the printed numbers (R2 R8 R11)

**Wave 2** *(blocked on Wave 1 completion)*

- [ ] 12-03-PLAN.md — Planer Max Depth replaces Extra Center Thickness: the blank list needs room for one deck pass and one bottom pass, its words say so, the defaults dialog shows the new rows, and the ROCKER reference picture is re-taken once (R1 R2 R8 R11)

**Wave 3** *(blocked on Wave 2 completion)*

- [ ] 12-04-PLAN.md — Tip Style becomes a shaper's own default in Fit & Tip Defaults, and every two-way pill is keyboard- and finger-friendly (R4 R8 R11)
- [ ] 12-05-PLAN.md — A picked board keeps its own Deck Skin, and the sidebar reads the foam off the bottom at every station and the planer passes at the center; presets keep their own cut (R1 R2 R3 R8 R11)
- [ ] 12-06-PLAN.md — Older boards open with the shaper's own Tip Style on every server path, and every board in the development database is proven to open with its numbers kept (R9 R11)
- [ ] 12-07-PLAN.md — The fit check keeps a planer pass under the center wherever the board sits, and refuses a board that would run under 1/8" thick (R2 R8 R11)

**Wave 4** *(blocked on Wave 3 completion)*

- [ ] 12-08-PLAN.md — Tip Style and Fine-tune off on the ROCKER sidebar, and THICKNESS explains how the foil is now cut (R4 R5 R6 R8 R11)
- [ ] 12-09-PLAN.md — The DATASHEET shows foam off the deck and off the bottom at every station, the drawing says so, and every board must now carry its own cut (R1 R2 R4 R7 R8 R10 R11)

**Wave 5** *(blocked on Wave 4 completion — a founder step)*

- [ ] 12-10-PLAN.md — The founder migrates production first (migration 0006 only), then merges, deploys and checks the live site (R9 R11)

Cross-cutting constraints: geometry pure and tested under `lib/geometry/` before any screen change, with a golden fixture of Phase 11's foil generated from tag `v1.3` in the first commit (R7); every conversion through `lib/geometry/units.ts` and every displayed number through `measure-display.ts` (R8); no new dependency and no package.json change (R11); additive migration 0006 to the development branch inside 12-02 and to production BEFORE the merge (CLAUDE.md Database, D-19 keeps `extra_center_thickness_mm` until a follow-up); the ROCKER desktop baseline re-recorded once in 12-03, TEMPLATE/RAILS/FINS/VOLUME byte-identical; every version 1–4 saved board still opens (R9, D-14).

---

## Progress

**Execution Order:**
Phases execute in numeric order: 1 → 2 → 3 → 4 (v1.0, complete) → 5 → 6 → 7 (v1.1, complete) → 8 → 9 → 10 (v1.2, complete) → 11 (v1.3, complete) → 12 (v1.4, in progress)

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
| 11. Rocker from Real Blanks | 13/13 | Complete    | 2026-09-26 |
| 12. Foil the Way a Shaper Cuts It | 0/10 | Planned |  |
