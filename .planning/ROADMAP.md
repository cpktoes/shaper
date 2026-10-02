# Roadmap: Shaper

## Overview

Shaper started from a working prototype (built in Claude Design) that already proved out the two "secret sauce" calculators — rail band and fin placement — but lived outside the codebase as a single self-contained page. **Milestone v1.0 (Phases 1–4, complete 2026-08-29)** ported that prototype into a real Next.js app and got it live with accounts and saving, proved the geometry math trustworthy and extended it to volume and printable templates, then built the rocker and foil editors as first-class interactive tools. A shaper can now log in, shape a full board design (outline, rocker, rail, foil, fins), see live-calculated rail band dimensions, fin placement and volume, save it as a named model, and print a full-size template to cut foam from — all of it in inches and litres.

**Milestone v1.1 (Phases 5–7, complete 2026-09-06)** gives the shaper a choice. Every board is already stored in millimetres, so this is presentation work: a units chooser in the settings menu, one set of metric formatters and parsers beside the imperial ones in `lib/geometry/units.ts`, and then every place a number is shown — roughly 300 of them across about 25 files — reading the shaper's chosen system instead of assuming inches. It lands in three passes a shaper can see and try one at a time: the chooser itself proving out on the setup screen, then the five design screens, then everything that comes out of a printer.

**Milestone v1.2 (Phases 8–10, complete 2026-09-12)** finishes what the prototype started and takes the app off the desk. The rails screen has always been missing its third tab — the INSTRUCTIONS page that names every mark on a rail cross-section and lets a shaper flip the example between Flat and Domed — along with a 1:1 on-screen view to hold against the foam, a plan and side reference showing where each section sits on the board, and an option to fold that instructions sheet into what gets printed. None of it needs new geometry: the prototype's `halveDeckMark1` flag turned out to be dead code, so the rail-band calculator already in `lib/` draws the example rail exactly as the reference did. The second half is phone work, and it is not polish — the five design screens carry zero responsive breakpoints today, so the phone layout is built from scratch and touch-first: one shared screen shell instead of five copies of the same sidebar-and-canvas layout, drawings that fill the screen, and drag handles on the outline, rocker and foil curves sized for a thumb. It lands in three passes: rails first (the smaller, self-contained port), then the design screens on a phone (where touch drag lives), then everything around them — sign-in, presets, the rack and the summary — walked end to end on a real iPhone and a real Android phone.

**Milestone v1.3 (Phase 11, complete 2026-09-26)** takes the rocker off the drawing board and puts it in real foam. The ROCKER screen stopped being a hand-drawn curve: a shaper sets a target centre thickness, picks a real blank that fits from the US Blanks, Arctic Foam and Marko Foam catalogues (162 blanks seeded from `db/seed/blanks/`, 158 pickable), slides the board along it, and the board's rocker, thickness and foil are read off where it sits in that foam — the four rocker numbers and the foam to remove live, every blank that won't fit listed with why, five Fit & Tip Defaults on the account, and older saved boards reopening hand-set. One phase of thirteen plans, planned, executed, reviewed, verified, walked by the founder and shipped to production in a day and a half.

**Milestone v1.4 (Phase 12, complete 2026-09-27)** models the foil the way a shaper actually cuts it. Phase 11 scaled the blank's thickness profile down to the centre thickness; a shaper does something else with a planer: skins the deck by a roughly constant amount, planes the bottom down to thickness, and only then thins the tips. The founder's brief put that on the screen — a deck skin taken off parallel to the blank's deck, the bottom planed down to centre thickness with the foam to remove shown as planer passes, a bottom curve parallel to the blank's rocker, and tip thinning in the last 12" with a pin-deck or bottom choice — so the DATASHEET's numbers became the numbers a shaper works to. One phase of ten plans, opened on branch `foil-real-shaping` the afternoon v1.3 shipped and live the next morning: production carried migration 0006 before the merge (`125a90f`), the founder passed all eight UAT checks on real phones and the live site, and every one of the phase's 35 declared threats is closed.

**Milestone v1.5 (Phase 13, opened 2026-09-27)** gets the app ready for the room. On Saturday 2026-10-10 the founder shows Shaper Assistant to many shapers at once. That is the build guide's M4, "invite shapers, free for everyone, watch what they use", and the founder plans to go public with tiered subscriptions (M5) shortly after hearing from them. A review on the day v1.4 closed found the app healthy but not yet ready for that. The live site ran a framework version with a critical security advisory. Three milestones of stale records were still open, along with five founder decisions and four provisional preset blanks. Volume had never been checked against a real finished board. The order form was missing the tips and the planer passes. And there was no way for a shaper to send feedback, or for the founder to see which screens get used. The phase has thirteen items, most of them small, run one at a time with a review between: safe fixes first, then the founder's decisions, then what shapers will test first, then what lets the founder listen, then a rehearsal on real phones and a freeze on Oct 7. **Phase 14 (opened 2026-10-02)** joins it at the founder's word, "before the 10th": the curves a shaper cuts foam to are redrawn so they flow the way a real surfboard does. A blank's bottom, thickness and width are drawn between their printed stations by the rule that redraws real blanks most closely (measured on the US Blanks catalogue), a hand-set board follows the same rule, and each tip runs down steadily from a start point that moves in when it has to, so no board comes out thinner near a tip than at the tip itself.

## Milestones

- ✅ **v1.0 — the design tool, in inches** — Phases 1–4 (shipped 2026-08-29)
- ✅ **v1.1 — Imperial vs Metric** — Phases 5–7 (shipped 2026-09-06)
- ✅ **v1.2 — Rails Finished, Phone Ready** — Phases 8–10 (shipped 2026-09-12)
- ✅ **v1.3 — Rocker from Real Blanks** — Phase 11 (shipped 2026-09-26)
- ✅ **v1.4 — Foil the Way a Shaper Cuts It** — Phase 12 (shipped 2026-09-27)
- 🚧 **v1.5 — Ready for the Shapers** — Phases 13–14 (in progress; the shapers see it 2026-10-10)

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

**Milestone v1.4 — Foil the Way a Shaper Cuts It (complete)**

- [x] **Phase 12: Foil the Way a Shaper Cuts It** - The foil modelled the way foam actually comes off: a deck skin taken off parallel to the blank's deck, the bottom planed down to centre thickness with the foam to remove shown as planer passes, a bottom curve parallel to the blank's rocker, and tip thinning in the last 12" with a pin-deck or bottom choice — the 12" stations still fine-tunable (completed 2026-09-27)

**Milestone v1.5 — Ready for the Shapers (in progress)**

- [ ] **Phase 13: Ready for the Shapers** - Safe, clean, credible and ready to listen by the founder's showing to many shapers on 2026-10-10: the security patch, housekeeping, the founder's open decisions, volume proven against real boards, the order form completed, a contact page, visitor analytics and a privacy page, a friendly error screen and link preview, and a real-device rehearsal before a freeze on Oct 7
- [ ] **Phase 14: Realistic Surfboard Flow** - A blank's bottom, thickness and width drawn between their printed stations by the square-root rule that redraws real blanks most closely, a hand-set board drawn the same way, and a steady taper into each tip from a start that is automatic and can be set by hand (6" to the board's centre) — built before the Oct 7 freeze

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

### Milestone v1.4: Foil the Way a Shaper Cuts It (Phase 12, complete 2026-09-27)

Shipped — 10 plans in one phase, in a day on branch `foil-real-shaping` (merged to `main` as 125a90f).
The foil is cut the way a planer works: a constant Deck Skin off the deck, the bottom planed parallel to
the blank's down to the centre thickness with the foam to remove read as a depth and as planer passes,
the four rocker numbers the blank's own, the tips thinned last inside the final 12" with the deck or the
bottom pinned, a per-board choice of which surface a 12" fine-tune moves, and the DATASHEET's FOAM OFF
rows for both surfaces. Fit & Tip Defaults holds Planer Max Depth, Deck Skin and Tip Style (Extra Center
Thickness retired, its column kept until a follow-up); saved boards moved to version 5 and every Phase 11
board reopens with its five station numbers kept. Production was migrated BEFORE the merge under the
expand-first database rule. No milestone audit was run; the phase closed on its own verification (11/11,
0 gaps), UAT (8/8 with the founder), security (35/35) and a code review with both warnings fixed. Five
founder questions stand open as decisions, not defects. Full phase detail archived in
[`.planning/milestones/v1.4-ROADMAP.md`](milestones/v1.4-ROADMAP.md); requirements in
[`.planning/milestones/v1.4-REQUIREMENTS.md`](milestones/v1.4-REQUIREMENTS.md); phase artifacts in
[`.planning/milestones/v1.4-phases/`](milestones/v1.4-phases/).

### Milestone v1.5: Ready for the Shapers (Phases 13–14, in progress — the shapers see it 2026-10-10)

### Phase 13: Ready for the Shapers

**Goal:** When a room of shapers sees the app on Saturday 2026-10-10 (the build guide's M4, "invite shapers"), it is safe, tidy, and credible on the numbers they know best, and it is ready to hear from them: the security patch live, the project clean, the founder's open decisions made, volume proven against real boards, the printed order form complete, a way for shapers to reach the founder and a count of which screens they use, and the whole trip rehearsed on real phones before a freeze on Wednesday 2026-10-07.
**Requirements**: Items 1–13 in `.planning/phases/13-ready-for-the-shapers/13-SPEC.md` (ordered; who does each and what "done" means), run one at a time with the founder's review between
**Depends on:** Phase 12
**Plans:** 11/13 items, plus 8b, 11a, 9b, 9c, 9d and 9e — each code item runs as its own `/gsd-quick` task named "Phase 13 item N"; founder items are recorded in the SPEC's Progress Log

Plans:

**Safe fixes shapers won't see (Mon–Tue, Sep 28–29)**

- [x] 1. Security patch: Next.js 16.3.6 and the other advisories cleared, every test suite green, deployed after the founder's go (quick 260927-onx, live 2026-09-27)
- [x] 2. Housekeeping: old branches, worktrees, starter images, the research cache, lint warnings and three milestones of stale records cleared (quick 260927-pij, live 2026-09-27)
- [x] 3. Retire the unused Extra Center Thickness column (code and deploy first, then the databases) (quick 260927-qrn, migration 0008 on both databases 2026-09-27)

**The founder's decisions (this week)**

- [x] 4. The five Phase 12 questions (answered 2026-09-28; the 1/4" floor and cause-named reasons, quick 260928-j00, and Deck Skin none–1", quick 260928-lm6, both live)
- [x] 5. The four preset blanks (the founder's US Blanks picks: Shortboard 6'3"RP (changed from 6'3"EA the same day), Fish 5'10"RP, Mid-length 7'4"SP, Longboard 9'3"Y — quick 260928-nu9, live 2026-09-28)
- [x] 6. The fin-placement tail question (ticked: fins drawn against the real tail; unticked keeps the generic tail — quick 260928-p45, live 2026-09-28)

**What shapers will test first (Wed–Fri, Sep 30–Oct 2)**

- [x] 7. Volume proven against three real boards with known litres (the founder checked the four presets against their expected volumes: all within 1/2–1 L, 2026-09-28)
- [x] 8. The order form carries the tip thicknesses and the planer passes (the founder's redirect: the tips stay on page 1's ROCKER strip; page 2 gets a PLANING table — Deck / Bottom, Foam Off and Passes — to the LEFT of the rail markings; quick 260928-r9h + 260928-tst + fast task 128, live 2026-09-29)
- [x] 8b. Page 2 on a phone print: the rail markings stop running into Fin Placement (founder's addition 2026-09-29; page-2 type on a phone sheet fits its page, every rail mark and fin number in its own box from 560 to 900 dots, the fin note's last line per system — quick 260928-vpi, live 2026-09-29)
- [ ] 9. Blank catalogue links (if time allows before the freeze) — skipped for now at the founder's word, 2026-09-29
- [x] 9b. Optional: a ghost of the last edit on TEMPLATE (founder's addition 2026-09-27; the founder's three choices — one edit ago from the undo history, stays with a hide button in the viewer toolbar, TEMPLATE only; a faint solid line at 55% — quick 260930-lia + fast task 138, live 2026-09-30)
- [x] 9c. Undo and redo buttons on every design screen on a computer — the phone's floating bottom-right pair extended to the desktop shell, appearing once there is something to take back (founder's addition 2026-09-30; quick 260930-lo8, live 2026-09-30)
- [x] 9d. A phone held sideways gets a thin top bar — the phone's compact bar and hamburger menu (with the six screens) replace the desktop row on a short screen, so the wordmark no longer wraps (founder's addition 2026-09-30, from walking the live site sideways; quick 260930-r8s, live 2026-09-30)
- [x] 9e. On a phone, upright or sideways, every band and gutter of chrome around the drawing is minimised — tab row, paddings, side gaps — with thumb-sized tap targets as the only floor; computers untouched (founder's addition 2026-09-30, after 9d; quick 260930-s23 + fast task 139 for Alternative A, live 2026-09-30)

**Ready to listen (Sat–Mon, Oct 3–5)**

- [x] 10. Contact page, plus email at shaperassistant.com — support@shaperassistant.com on Zoho Mail (after Forward Email, then ImprovMX + SMTP2GO, the same day); the form is live through Resend (quick 260929-u1t + 260929-w2k, live 2026-09-30; the founder's addition, 2026-09-29)
- [x] 11a. A shaper can delete their own account and everything saved with it — Clerk's own button plus automatic cleanup (founder's addition 2026-09-30, before 11; quick 260930-ckm, live 2026-09-30)
- [x] 11. Visitor analytics and a privacy page (quick 260930-03d, live 2026-09-30)
- [x] 12. A friendly error screen and a link-preview picture (quick 260930-fjm + fast task 135, live 2026-09-30)

**Rehearse, then freeze (Tue–Thu, Oct 6–8)**

- [ ] 13. Real-device rehearsal on the live site (Android, iPhone, the presenting laptop, a non-founder Google sign-up), then the freeze — prepared 2026-09-30: the walk sheet is `13-UAT.md`

### Phase 14: Realistic Surfboard Flow

**Goal:** Every curve a shaper cuts foam to flows the way a real surfboard does: a blank's bottom, thickness and width are drawn between their printed stations by the rule that redraws real blanks most closely, a hand-set board is drawn by the same rule, and a board's thickness runs down steadily into each tip, never thinner on the way than the tip itself — built and live before the founder shows the app to a room of shapers on Saturday 2026-10-10.
**Requirements**: R1–R9 locked in `.planning/phases/14-realistic-surfboard-flow/14-SPEC.md` (the founder's own words and their four answers of 2026-10-02), with the measured research in `.planning/todos/completed/2026-09-28-give-the-foil-and-rocker-curves-a-realistic-surfboard-flow.md`
**Depends on:** Phase 12 (the planer cut and the tip rule it changes); runs beside Phase 13, whose rehearsal and freeze it must be ready for
**Plans:** 18 plans in 10 waves — planned 2026-10-02 (`14-RESEARCH.md` first: both steps rebuilt in a scratch copy and every figure reproduced; the founder's three rulings and six more from the research are D-20 to D-28). Go-live 1 (the curves) is wave 5 and go-live 2 (the tips) is wave 10, each a founder checkpoint alone in its wave. No code is written before the founder approves this plan (D-15).

Plans:

**Wave 1**

- [ ] 14-01-PLAN.md — Write down every number the app shows today, from the live code (commit `ed39f4a`), before anything about the curves changes (R2 R4 R8 R9)

**Wave 2** *(blocked on Wave 1 completion)*

- [ ] 14-02-PLAN.md — Write the new square-root curve and prove it on every blank before anything uses it (R1 R2 R3 R5 R8)

**Wave 3** *(blocked on Wave 2 completion)*

- [ ] 14-03-PLAN.md — Draw every blank's bottom, thickness and width with the new curves; today's curve keeps its own name, and boards saved under Phase 11 keep their numbers (R1 R2 R3 R4 R5 R8)
- [ ] 14-04-PLAN.md — Draw the first board a visitor sees (and any board without a blank) with the same new curves, through the same five numbers (R3 R4)

**Wave 4** *(blocked on Wave 3 completion)*

- [ ] 14-05-PLAN.md — Print the founder's before-and-after figures, add a read-only curves report on the real saved boards, and prove that opening a saved board writes nothing (R8 R9)
- [ ] 14-06-PLAN.md — Re-record the preset cards' figures from the app, and the two reference pictures the new curves move (ROCKER, VOLUME) (R4 R8 R9)

**Wave 5** *(blocked on Wave 4 completion — a founder step)*

- [ ] 14-07-PLAN.md — Go-live 1: the founder sees what moves and the saved-boards report, says go, and the curves (only the curves) go live — target Saturday 2026-10-03 (R8 R9)

**Wave 6** *(blocked on go-live 1)*

- [ ] 14-08-PLAN.md — Write the steady taper and the Automatic start as one small, tested piece of maths (R6 R7)
- [ ] 14-09-PLAN.md — Let a board remember where each tip's thinning starts; a board without one is on Automatic and nothing breaks (R6 R8)

**Wave 7** *(blocked on Wave 6 completion)*

- [ ] 14-10-PLAN.md — Make every board in a blank taper steadily into its tips, never thinner than the tip itself; today's blend is kept by name for the reports (R1 R6 R7)
- [ ] 14-11-PLAN.md — Write every word and slider range the Thinning Starts rows will show, in inches and in centimetres (R6)

**Wave 8** *(blocked on Wave 7 completion)*

- [ ] 14-12-PLAN.md — Put each tip's start on the side profile every screen reads, and carry a start set by hand through every place a board is worked out (R6 R8 R9)
- [ ] 14-13-PLAN.md — Add "your thinning starts too close to the tip" as a won't-fit reason, and prove Automatic ignores the tweaks, the Deck Skin and Tip Style and moves smoothly (R6 R7)

**Wave 9** *(blocked on Wave 8 completion)*

- [ ] 14-14-PLAN.md — The two Thinning Starts sliders and their Automatic buttons on ROCKER, working end to end (R6)
- [ ] 14-15-PLAN.md — Mark each tip's start on the drawing and show it on the DATASHEET (R6)
- [ ] 14-16-PLAN.md — Print each tip's start in the order form's PLANING box (R6)
- [ ] 14-17-PLAN.md — Make the blank list and the fit flag judge with the board's own starts; prepare the tips report and the tips pictures' figures (R6 R8 R9)

**Wave 10** *(blocked on Wave 9 completion — a founder step)*

- [ ] 14-18-PLAN.md — Go-live 2: the founder sees what moves and the tips report, says go (or takes the Tuesday cut line, D-16), and the tips go live; the rehearsal walk follows (R6 R7 R8 R9)

Cross-cutting constraints: no tips code in the curves step — no `slopeAt`, no taper module, the 12" blend untouched until go-live 1 (D-28); today's rules stay callable by name, never as a second argument on the live function (D-25); no hand-typed expected number — every expected value comes from a generated fixture or the catalogue (Rule 1); the pin and the test boards carry their blanks by value; opening a saved board writes nothing and nothing in the database changes (D-06, D-24); no start is stored on a board that is on Automatic; one helper feeds all six places a board's inputs are built; Automatic reads only the planer cut, never the tweaks, the Deck Skin or Tip Style (D-04); the saved-boards report prints counts only and writes nothing (D-18); no formula in a component and no unit conversion outside `units.ts` (Rule 2); nothing is said on screen (D-19); only the ROCKER and VOLUME desktop baselines move, only at the curves step; no new package, no loose scratch script; nothing is pushed without the founder's go and nothing lands after the Wednesday 2026-10-07 freeze (constraint 8).

---

## Progress

**Execution Order:**
Phases execute in numeric order: 1 → 2 → 3 → 4 (v1.0, complete) → 5 → 6 → 7 (v1.1, complete) → 8 → 9 → 10 (v1.2, complete) → 11 (v1.3, complete) → 12 (v1.4, complete) → 13 → 14 (v1.5, in progress)

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
| 12. Foil the Way a Shaper Cuts It | 10/10 | Complete    | 2026-09-27 |
| 13. Ready for the Shapers | 11/13 items | In progress | - |
| 14. Realistic Surfboard Flow | 0/18 | Planned | - |
