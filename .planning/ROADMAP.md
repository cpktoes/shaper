# Roadmap: Shaper

## Overview

Shaper started from a working prototype (built in Claude Design) that already proved out the two "secret sauce" calculators — rail band and fin placement — but lived outside the codebase as a single self-contained page. **Milestone v1.0 (Phases 1–4, complete 2026-08-29)** ported that prototype into a real Next.js app and got it live with accounts and saving, proved the geometry math trustworthy and extended it to volume and printable templates, then built the rocker and foil editors as first-class interactive tools. A shaper can now log in, shape a full board design (outline, rocker, rail, foil, fins), see live-calculated rail band dimensions, fin placement and volume, save it as a named model, and print a full-size template to cut foam from — all of it in inches and litres.

**Milestone v1.1 (Phases 5–7, complete 2026-09-06)** gives the shaper a choice. Every board is already stored in millimetres, so this is presentation work: a units chooser in the settings menu, one set of metric formatters and parsers beside the imperial ones in `lib/geometry/units.ts`, and then every place a number is shown — roughly 300 of them across about 25 files — reading the shaper's chosen system instead of assuming inches. It lands in three passes a shaper can see and try one at a time: the chooser itself proving out on the setup screen, then the five design screens, then everything that comes out of a printer.

**Milestone v1.2 (Phases 8–10, complete 2026-09-12)** finishes what the prototype started and takes the app off the desk. The rails screen has always been missing its third tab — the INSTRUCTIONS page that names every mark on a rail cross-section and lets a shaper flip the example between Flat and Domed — along with a 1:1 on-screen view to hold against the foam, a plan and side reference showing where each section sits on the board, and an option to fold that instructions sheet into what gets printed. None of it needs new geometry: the prototype's `halveDeckMark1` flag turned out to be dead code, so the rail-band calculator already in `lib/` draws the example rail exactly as the reference did. The second half is phone work, and it is not polish — the five design screens carry zero responsive breakpoints today, so the phone layout is built from scratch and touch-first: one shared screen shell instead of five copies of the same sidebar-and-canvas layout, drawings that fill the screen, and drag handles on the outline, rocker and foil curves sized for a thumb. It lands in three passes: rails first (the smaller, self-contained port), then the design screens on a phone (where touch drag lives), then everything around them — sign-in, presets, the rack and the summary — walked end to end on a real iPhone and a real Android phone.

**Milestone v1.3 (Phase 11, complete 2026-09-26)** takes the rocker off the drawing board and puts it in real foam. The ROCKER screen stopped being a hand-drawn curve: a shaper sets a target centre thickness, picks a real blank that fits from the US Blanks, Arctic Foam and Marko Foam catalogues (162 blanks seeded from `db/seed/blanks/`, 158 pickable), slides the board along it, and the board's rocker, thickness and foil are read off where it sits in that foam — the four rocker numbers and the foam to remove live, every blank that won't fit listed with why, five Fit & Tip Defaults on the account, and older saved boards reopening hand-set. One phase of thirteen plans, planned, executed, reviewed, verified, walked by the founder and shipped to production in a day and a half.

**Milestone v1.4 (Phase 12, complete 2026-09-27)** models the foil the way a shaper actually cuts it. Phase 11 scaled the blank's thickness profile down to the centre thickness; a shaper does something else with a planer: skins the deck by a roughly constant amount, planes the bottom down to thickness, and only then thins the tips. The founder's brief put that on the screen — a deck skin taken off parallel to the blank's deck, the bottom planed down to centre thickness with the foam to remove shown as planer passes, a bottom curve parallel to the blank's rocker, and tip thinning in the last 12" with a pin-deck or bottom choice — so the DATASHEET's numbers became the numbers a shaper works to. One phase of ten plans, opened on branch `foil-real-shaping` the afternoon v1.3 shipped and live the next morning: production carried migration 0006 before the merge (`125a90f`), the founder passed all eight UAT checks on real phones and the live site, and every one of the phase's 35 declared threats is closed.

**Milestone v1.5 (Phase 13, opened 2026-09-27)** gets the app ready for the room. On Saturday 2026-10-10 the founder shows Shaper Assistant to many shapers at once. That is the build guide's M4, "invite shapers, free for everyone, watch what they use", and the founder plans to go public with tiered subscriptions (M5) shortly after hearing from them. A review on the day v1.4 closed found the app healthy but not yet ready for that. The live site ran a framework version with a critical security advisory. Three milestones of stale records were still open, along with five founder decisions and four provisional preset blanks. Volume had never been checked against a real finished board. The order form was missing the tips and the planer passes. And there was no way for a shaper to send feedback, or for the founder to see which screens get used. The phase has thirteen items, most of them small, run one at a time with a review between: safe fixes first, then the founder's decisions, then what shapers will test first, then what lets the founder listen, then a rehearsal on real phones and a freeze on Oct 7. **Phase 14 (opened 2026-10-02)** joins it at the founder's word, "before the 10th": the curves a shaper cuts foam to are redrawn so they flow the way a real surfboard does. A blank's bottom, thickness and width are drawn between their printed stations by the rule that redraws real blanks most closely (measured on the US Blanks catalogue), a hand-set board follows the same rule, and each tip runs down steadily from a start point that moves in when it has to, so no board comes out thinner near a tip than at the tip itself. **Phase 15 (opened 2026-10-05)** follows at the founder's word, "before Wednesday's freeze": the home page's saved boards become the Board Rack, boards standing sideways at one true scale like a shop rack, each turning its real turn to show its outline as the cursor or the thumb passes, kept in the order the shaper sets (sketches 009–011). **Phase 16 (opened 2026-11-03, live 2026-11-06)** draws the board as a solid under shaping-room lights on a 3D screen of its own and exports it for a CNC program. **Phase 17 (opened 2026-11-08)** puts the bottom in: a BOTTOM screen between ROCKER and RAILS where each section takes a named cut and the tail its channels, every cut shaded and lined at 1/16" of depth, sectioned and tabled, and counted in the litres, the 3D board and the CNC files (sketches 019–021).

## Milestones

- ✅ **v1.0 — the design tool, in inches** — Phases 1–4 (shipped 2026-08-29)
- ✅ **v1.1 — Imperial vs Metric** — Phases 5–7 (shipped 2026-09-06)
- ✅ **v1.2 — Rails Finished, Phone Ready** — Phases 8–10 (shipped 2026-09-12)
- ✅ **v1.3 — Rocker from Real Blanks** — Phase 11 (shipped 2026-09-26)
- ✅ **v1.4 — Foil the Way a Shaper Cuts It** — Phase 12 (shipped 2026-09-27)
- 🚧 **v1.5 — Ready for the Shapers** — Phases 13–17 (in progress; the shapers saw it 2026-10-10)

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

- [x] **Phase 13: Ready for the Shapers** - Safe, clean, credible and ready to listen by the founder's showing to many shapers on 2026-10-10: the security patch, housekeeping, the founder's open decisions, volume proven against real boards, the order form completed, a contact page, visitor analytics and a privacy page, a friendly error screen and link preview, and a real-device rehearsal before a freeze on Oct 7 (completed 2026-11-14 at the founder's word)
- [x] **Phase 14: Realistic Surfboard Flow** - A blank's bottom, thickness and width drawn between their printed stations by the square-root rule that redraws real blanks most closely, a hand-set board drawn the same way, and a steady taper into each tip from a start that is automatic and can be set by hand (6" to the board's centre) — built before the Oct 7 freeze (live 2026-10-02 in two go-lives; completed 2026-11-14 at the founder's word)
- [x] **Phase 15: The Board Rack** - "Your Boards" on the home page becomes the Board Rack: the shaper's boards stand sideways at one true scale like a shop rack, name and dims running up beside each, and the board under the cursor or in the middle of a phone's swipe turns its real turn to show its outline; the shaper sets the rack's order (drag on a computer, hold then slide on a phone) and the unsaved board stays first — live before the Oct 7 freeze
- [x] **Phase 16: 3D Board and CNC Export** - The board drawn as a realistic 3D surface on its own 3D screen, spun and moved in every direction under shaping-room lighting that shows its contours, built from the same cross-sections the litres count; and that surface exported as a file a CNC shaping program (Shape3D, AkuShaper) can take in as a 3D guide (completed 2026-11-06; opened 2026-11-03 on branch `board-3d`; the Shape3D test left open by the founder)
- [x] **Phase 17: BOTTOM — Bottom Contours a Shaper Can Map, Measure and Cut** - A BOTTOM screen between ROCKER and RAILS: Nose, Center and Tail each take one of six named cuts (flat, belly, vee, single or double concave) and the tail 4, 6 or 8 channels cut last; the bottom seen from above as a shade with a line every 1/16" of depth, a cross-section at a sliding station with gauge-style depths, DATA every 6" and a GUIDE card per cut; one foam-off number read by VOLUME, the 3D board, the CNC files and RAILS (opened 2026-11-08 from sketches 019–021) (completed 2026-11-11)
- [x] **Phase 18: A GUIDE on Every Page** - A GUIDE tab, last on each of TEMPLATE, ROCKER, RAILS, VOLUME and FINS: one card per control or named choice with the board's own value, a cartoon of the open board with that one setting pushed through the app's own maths, two sentences and a How to shape note; FINS by setup with the MODEL INFO notes on the cards and that tab gone (opened 2026-11-09 from sketch 022 on branch `page-guides`; live 2026-11-10 as main `79110e41`)

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
**Plans:** 13/13 items closed (12 done; item 9 closed unbuilt), plus 8b, 11a, 9b, 9c, 9d and 9e — each code item runs as its own `/gsd-quick` task named "Phase 13 item N"; founder items are recorded in the SPEC's Progress Log

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
- [x] 9. Blank catalogue links (if time allows before the freeze) — skipped for now at the founder's word, 2026-09-29; closed unbuilt with the phase on 2026-11-14 — the idea stays as the to-do "Open the blank's own catalog page from the app"
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

- [x] 13. Real-device rehearsal on the live site (Android, iPhone, the presenting laptop, a non-founder Google sign-up), then the freeze — prepared 2026-09-30: the walk sheet is `13-UAT.md` — closed 2026-11-14 at the founder's word, after the 2026-10-10 showing; four of the nine checks were recorded as passed on 2026-10-03, the others were not recorded one by one

### Phase 14: Realistic Surfboard Flow

**Goal:** Every curve a shaper cuts foam to flows the way a real surfboard does: a blank's bottom, thickness and width are drawn between their printed stations by the rule that redraws real blanks most closely, a hand-set board is drawn by the same rule, and a board's thickness runs down steadily into each tip, never thinner on the way than the tip itself — built and live before the founder shows the app to a room of shapers on Saturday 2026-10-10.
**Requirements**: R1–R9 locked in `.planning/phases/14-realistic-surfboard-flow/14-SPEC.md` (the founder's own words and their four answers of 2026-10-02), with the measured research in `.planning/todos/completed/2026-09-28-give-the-foil-and-rocker-curves-a-realistic-surfboard-flow.md`
**Depends on:** Phase 12 (the planer cut and the tip rule it changes); runs beside Phase 13, whose rehearsal and freeze it must be ready for
**Plans:** 18/18 plans executed in 10 waves — planned 2026-10-02 (`14-RESEARCH.md` first: both steps rebuilt in a scratch copy and every figure reproduced; the founder's three rulings and six more from the research are D-20 to D-28). Go-live 1 (the curves) is wave 5 and go-live 2 (the tips) is wave 10, each a founder checkpoint alone in its wave. No code is written before the founder approves this plan (D-15).

Plans:

**Wave 1**

- [x] 14-01-PLAN.md — Write down every number the app shows today, from the live code (commit `ed39f4a`), before anything about the curves changes (R2 R4 R8 R9)

**Wave 2** *(blocked on Wave 1 completion)*

- [x] 14-02-PLAN.md — Write the new square-root curve and prove it on every blank before anything uses it (R1 R2 R3 R5 R8)

**Wave 3** *(blocked on Wave 2 completion)*

- [x] 14-03-PLAN.md — Draw every blank's bottom, thickness and width with the new curves; today's curve keeps its own name, and boards saved under Phase 11 keep their numbers (R1 R2 R3 R4 R5 R8)
- [x] 14-04-PLAN.md — Draw the first board a visitor sees (and any board without a blank) with the same new curves, through the same five numbers (R3 R4)

**Wave 4** *(blocked on Wave 3 completion)*

- [x] 14-05-PLAN.md — Print the founder's before-and-after figures, add a read-only curves report on the real saved boards, and prove that opening a saved board writes nothing (R8 R9)
- [x] 14-06-PLAN.md — Re-record the preset cards' figures from the app, and the two reference pictures the new curves move (ROCKER, VOLUME) (R4 R8 R9)

**Wave 5** *(blocked on Wave 4 completion — a founder step)*

- [x] 14-07-PLAN.md — Go-live 1: the founder sees what moves and the saved-boards report, says go, and the curves (only the curves) go live — target Saturday 2026-10-03 (R8 R9)

**Wave 6** *(blocked on go-live 1)*

- [x] 14-08-PLAN.md — Write the steady taper and the Automatic start as one small, tested piece of maths (R6 R7)
- [x] 14-09-PLAN.md — Let a board remember where each tip's thinning starts; a board without one is on Automatic and nothing breaks (R6 R8)

**Wave 7** *(blocked on Wave 6 completion)*

- [x] 14-10-PLAN.md — Make every board in a blank taper steadily into its tips, never thinner than the tip itself; today's blend is kept by name for the reports (R1 R6 R7)
- [x] 14-11-PLAN.md — Write every word and slider range the Thinning Starts rows will show, in inches and in centimetres (R6)

**Wave 8** *(blocked on Wave 7 completion)*

- [x] 14-12-PLAN.md — Put each tip's start on the side profile every screen reads, and carry a start set by hand through every place a board is worked out (R6 R8 R9)
- [x] 14-13-PLAN.md — Add "your thinning starts too close to the tip" as a won't-fit reason, and prove Automatic ignores the tweaks, the Deck Skin and Tip Style and moves smoothly (R6 R7)

**Wave 9** *(blocked on Wave 8 completion)*

- [x] 14-14-PLAN.md — The two Thinning Starts sliders and their Automatic buttons on ROCKER, working end to end (R6)
- [x] 14-15-PLAN.md — Mark each tip's start on the drawing and show it on the DATASHEET (R6)
- [x] 14-16-PLAN.md — Print each tip's start in the order form's PLANING box (R6)
- [x] 14-17-PLAN.md — Make the blank list and the fit flag judge with the board's own starts; prepare the tips report and the tips pictures' figures (R6 R8 R9)

**Wave 10** *(blocked on Wave 9 completion — a founder step)*

- [x] 14-18-PLAN.md — Go-live 2: the founder sees what moves and the tips report, says go (or takes the Tuesday cut line, D-16), and the tips go live; the rehearsal walk follows (R6 R7 R8 R9)

Cross-cutting constraints: no tips code in the curves step — no `slopeAt`, no taper module, the 12" blend untouched until go-live 1 (D-28); today's rules stay callable by name, never as a second argument on the live function (D-25); no hand-typed expected number — every expected value comes from a generated fixture or the catalogue (Rule 1); the pin and the test boards carry their blanks by value; opening a saved board writes nothing and nothing in the database changes (D-06, D-24); no start is stored on a board that is on Automatic; one helper feeds all six places a board's inputs are built; Automatic reads only the planer cut, never the tweaks, the Deck Skin or Tip Style (D-04); the saved-boards report prints counts only and writes nothing (D-18); no formula in a component and no unit conversion outside `units.ts` (Rule 2); nothing is said on screen (D-19); only the ROCKER and VOLUME desktop baselines move, only at the curves step; no new package, no loose scratch script; nothing is pushed without the founder's go and nothing lands after the Wednesday 2026-10-07 freeze (constraint 8).

### Phase 15: The Board Rack

**Goal:** A shaper sees their whole quiver at once on the home page and enjoys browsing it: "Your Boards" becomes the Board Rack, every board standing sideways at one true scale on one floor line with its name and dims running up beside it, the board under the cursor (or passing the middle of a phone's swipe) turning its real turn — worked out from its own rocker, thickness and outline — to show its outline, and the rack kept in the order the shaper sets.
**Requirements**: R1, R2, R3, R4, R5, R6, R7, R8, R9, R10
**Brief:** locked in `.planning/phases/15-the-board-rack/15-SPEC.md` (the founder's idea and decisions of 2026-10-05, from sketches 009–011 and the `sketch-findings-shaper` skill)
**Depends on:** Phase 14 (the side profile the rack draws from); runs inside Phase 13's window — live before the Wednesday 2026-10-07 freeze, with a rehearsal walk after
**Plans:** 13/13 plans complete

Plans:

**Wave 1**

- [x] 15-01-PLAN.md — Work out each board's real turn as tested maths (side profile at rest, the TEMPLATE outline when turned, swallow notch included), and leave out any board the rack can't draw (R1 R3)
- [x] 15-02-PLAN.md — Lay the rack out at one true scale on one floor line, with height lines, names that shrink then cut, and every gesture timing in one place (R1 R2 R4 R5 R6)
- [x] 15-03-PLAN.md — The rules for the shaper's order (new boards first, a copy beside its original, the unsaved board always first), the save timing, the rack's words and the one-constant D-11 switch (R7 R8 R9)
- [x] 15-05-PLAN.md — A practice rack for the browser tests that never reaches the live site, and pictures of today's rack (R5 R6)

**Wave 2** *(blocked on Wave 1 completion)*

- [x] 15-04-PLAN.md — Give the order an empty place on the shaper's account (development database only) and a safe way to save it (R8)
- [x] 15-06-PLAN.md — TRACER: the Board Rack on the home page, drawn from real boards, turning as the cursor passes (R1 R2 R3 R4 R5 R7 R9)

**Wave 3** *(blocked on Wave 2 completion)*

- [x] 15-07-PLAN.md — On a phone or iPad, swipe along the rack, each board turning as it passes the middle (R1 R2 R6)
- [x] 15-08-PLAN.md — The home page reads the stored order, new boards and copies land where the founder ruled, and the founder gets a read-only report on the real boards (R8 R10)

**Wave 4** *(blocked on Wave 3 completion)*

- [x] 15-09-PLAN.md — Hold a board and slide it on a phone; the order saves and says so (R8 R9)

**Wave 5** *(blocked on Wave 4 completion — 15-10 is a founder step)*

- [x] 15-10-PLAN.md — The founder tries hold-and-drag on their iPad and an Android phone and rules on D-11 (R8 R10)
- [x] 15-11-PLAN.md — Move boards on a computer by drag, the ⋯ menu or the keyboard, and walk the rack without a mouse (R5 R8 R9)

**Wave 6** *(blocked on Wave 5 completion)*

- [x] 15-12-PLAN.md — Standing checks of the brief's rules, the CLAUDE.md pointer sentence, and the walk and walk sheet updated for the rack (R4 R7 R10)

**Wave 7** *(blocked on Wave 6 completion — a founder step)*

- [x] 15-13-PLAN.md — Go-live: pictures, the read-only report, the production migration with the founder present, one push, a live check, then hand over the rehearsal walk (R10)

Cross-cutting constraints: geometry pure and tested in `lib/geometry/` with no hand-typed expected number (Rule 1); every number through `units.ts` / `formatSummaryLine` (Rule 2); the rack kind read only from the pointer, never width (D-04); the unsaved board always first and never moved (R9); the order column is added on the development branch during the work and reaches production only inside 15-13 with the founder present, before the push (Database rule); the test-only `/test-rack` route 404s in production; no new package; nothing pushed without the founder's go and nothing after the Wednesday 2026-10-07 freeze.

### Phase 16: 3D Board and CNC Export

**Goal:** A shaper sees the board they designed as a solid, realistic surface they can spin and move in every direction, lit the way a shaping room is lit so every contour shows, on a 3D screen of its own; and takes that surface away as a file a CNC shaping program (Shape3D, AkuShaper) can read as a 3D guide — a wireframe (DXF) and/or XYZ text files for the outline, the profile and the slices. The surface is built from the same cross-sections the litres count (the finished rail at every station along the rocker), so what the shaper sees and exports is exactly what VOLUME counts. Reading Shape3D's and AkuShaper's own files (.s3d/.s3dx, .brd) is deliberately left for a later phase.
**Requirements**: R1, R2, R3, R4, R5, R6, R7, R8, R9, R10, R11, R12 (locked in `phases/16-3d-board-and-cnc-export/16-SPEC.md` from 16-CONTEXT.md's D-01–D-28 and the approved 16-UI-SPEC.md)
**Brief:** `phases/16-3d-board-and-cnc-export/16-SPEC.md` (R1–R12 from the founder's words of 2026-11-03), decisions D-01–D-28 in `16-CONTEXT.md`, the approved `16-UI-SPEC.md`, the measured `16-RESEARCH.md` and the mock-up `pictures/3d-board-mockup.png`
**Depends on:** Phase 15 (the rack's turn maths), quick 261102-gec (the finished rail), quick 261103-gcm (the foam at every station)
**Plans:** 18/18 plans complete

Plans:

**Wave 1**

- [x] 16-01-PLAN.md — Pin today's litres for 40 test boards, share one section function between the litres and the coming 3D board (every figure identical), then fade the tail's hard edge from 12" to 18" in the litres (R2 R9 R11 R12)

**Wave 2** *(blocked on Wave 1 completion; merge 16-02 before 16-03)*

- [x] 16-02-PLAN.md — The Hard Edge Ends At slider on RAILS (the tail's Advanced menu, 14"–24"), saved with the board, reset in one undo, and a read-only report of how every saved board's litres move (R9 R10 R11 R12)
- [x] 16-03-PLAN.md — The 3D board's surface as tested maths: the litres' own sections lofted into one closed shape within 0.15% of VOLUME, the swallow in two pieces, sharp edges kept sharp (R2 R3 R8 R12)

**Wave 3** *(blocked on Wave 2 completion; 16-04 is a founder step; 16-06 first — it installs three, then `npm install` in the main checkout)*

- [x] 16-04-PLAN.md — Go-live 1, only if the founder chose two go-lives: the hard edge's fade and the slider go live on their own (R9 R11 R12)
- [x] 16-05-PLAN.md — The CNC files: one zip with a DXF wireframe, the outline, profile and slice text files and an STL, in millimetres in Shape3D's axes, each read back by its own reader (R7 R8 R12)
- [x] 16-06-PLAN.md — TRACER: the 3D screen at /design/3d draws the board lit under the shaping-room lights, with three.js on that route only and plain messages when it can't draw (R1 R2 R3 R10 R11 R12)

**Wave 4** *(blocked on Wave 3 completion)*

- [x] 16-07-PLAN.md — Turn the board: drag with a glide, the five views and Reset View, the arrow keys; the camera and lights stay fixed (R4 R10 R12)
- [x] 16-08-PLAN.md — Seven screens in the app: 3D last in the top row, the seventh tile on the phone menu, SUMMARY's Next goes to 3D, the code and documents say seven (R1 R10 R11 R12)

**Wave 5** *(blocked on Wave 4 completion; until it merges, the six-count specs and the five desktop pictures are expected to fail)*

- [x] 16-14-PLAN.md — The browser checks count seven screens, and the five desktop pictures are re-recorded for the top row only, on a looked-at diff (R1 R10 R12)

**Wave 6** *(blocked on Wave 5)*

- [x] 16-09-PLAN.md — Zoom and slide: the shared zoom row, wheel, pinch, right-drag or two fingers, double-click back to 1x, Wide view (R4 R10 R12)

**Wave 7** *(blocked on Wave 6)*

- [x] 16-10-PLAN.md — Fins on the board: generic outlines with true bases at their FINS placement, a single fin as deep as the board is long in feet, and the Fins switch (R3 R5 R10 R12)

**Wave 8** *(blocked on Wave 7)*

- [x] 16-11-PLAN.md — The blank as a see-through ghost, Contour Stripes, colours that follow the theme, and the loading picture (R3 R5 R6 R10 R12)

**Wave 9** *(blocked on Wave 8)*

- [x] 16-12-PLAN.md — Export for CNC… on the 3D panel: one tap, one zip, the Shape3D note, every state (no drawing, can't build, locked, signed out), plus the 3D screen's desktop picture (R7 R8 R10 R11 R12)

**Wave 10** *(blocked on Wave 9; added 2026-11-04 for D-32, planned and approved with the founder's rulings)*

- [x] 16-15-PLAN.md — The tail's whole rail character (hard edge, the tucks, Family, Symmetrical) fades between Tail Rail Blends From and Ends At into the centre's rail as set; the centre-to-nose rail blends smoothly on its own with no control; the rows renamed for the tail rail; a saved-boards rail-character report (R2 R9 R10 R11 R12)

**Wave 11** *(blocked on Wave 10; added 2026-11-04 for D-33 and D-34, planned and approved with the founder's rulings)*

- [x] 16-16-PLAN.md — The deck stays smooth across a wing (only the rail's bands step in, easing out at Deck Mark 3; the bottom carries through) and the surface runs into each tip without a flip, VOLUME counting the tips' foam; rings at a wing's step; a read-only surface report (R2 R3 R8 R11 R12)

**Wave 12** *(blocked on Wave 11; added 2026-11-04 for D-35 and D-36, planned with the founder's rulings)*

- [x] 16-17-PLAN.md — The Fins, Blank and Contour Stripes switches become icons in the viewer's corner, the panel's SHOW section goes, and every fin gets a real shape per setup: the whole fin stretches to FINS' base, a box keel's whole footprint sits on the placement dots, quad rears 25% shorter than the fronts, twins default to 5.5" and keels to 6.5" (R5 R6 R10 R11 R12)

**Wave 13** *(blocked on Wave 12; added 2026-11-05 for D-43, planned with the founder's rulings)*

- [x] 16-18-PLAN.md — The shaping bay: a drawn room with the strips under the shelves, the board on racks that flips, lifts at either end and rolls with one control per plane, Turn the Board and Walk Around, and a Room switch for a plain background (R3 R4 R5 R6 R10)

**Wave 14** *(blocked on Wave 13; a founder step)*

- [x] 16-13-PLAN.md — Go-live: with two go-lives, first bring main's go-live-1 merge onto the branch; then the full gate, the founder's Shape3D test and device checks, one push on his go, a live check (R7 R8 R9 R11 R12)

Cross-cutting constraints: geometry pure and tested in `lib/geometry/` and `lib/export/`, no expected number typed — every figure from the pin, a script-made fixture or the app's own functions (Rule 1); every conversion through `units.ts`, the single fin's feet rule included, and the files in millimetres (Rule 2); `three@0.186.1` exact, imported only by `components/3d/board-scene.ts` and only through `import()`; one section function (`boardSections`) feeds the litres, the drawing and the STL; no database change, nothing announced, switches and view never saved; width / pointer / height stay the only three layout switches; each executor in its own worktree with its own PW_PORT (3201–3212), never touching port 3005; every plan ends with the founder's look at pictures; nothing pushed without his go.

### Phase 17: BOTTOM — Bottom Contours a Shaper Can Map, Measure and Cut

**Goal:** A shaper maps, measures and cuts the bottom of the board they designed. A new design screen, **BOTTOM**, sits between ROCKER and RAILS — the shop order, after the blank is planed to thickness and before the rails are banded. Each of three sections, Nose, Center and Tail, takes one of six named cuts (a flat, a belly, a vee, a single or a double concave under the names a shaper uses), and the tail can take four, six or eight channels cut last. The page shows the bottom from above with every cut as a shade and a contour line at each 1/16" of depth, a cross-section at a station the shaper slides along the board with the depths dimensioned as a gauge reads them, a DATA table of depths and layout marks every 6", and a GUIDE that teaches each cut with a cartoon drawn from the open board. One number drives all of it — the foam taken off at a station and a distance from the stringer — so VOLUME's litres, the 3D board, the CNC files and RAILS all read the same cut. The app's thickness is the planed number and the contour comes out of it; contours only take foam away and cuts stack in shaping order; depth runs to 1/2" in 1/16" steps; the presets stay flat; nothing is printed full size; a saved board gets one new optional field with no database change.
**Requirements**: R1–R15 (locked in `phases/17-bottom-contours/17-SPEC.md` from the founder's rulings on sketches 019–021, 2026-11-06 to 2026-11-08)
**Brief:** `phases/17-bottom-contours/17-SPEC.md`; the decided sketches `.planning/sketches/019-bottom-contours/`, `020-bottom-channels/` and `021-bottom-guide/` (its `index.html` is the page as it will be built); the starting numbers and their sources in `todos/pending/2026-11-06-set-the-bottom-contours-starting-numbers-from-the-shop.md`
**Depends on:** Phase 16 (`boardSections`, the 3D surface and the CNC writers read the cut), Phase 14 (the planed thickness and the side profile the cut comes out of), quick 261102-gec (the finished rail the ghost draws), quick 261103-gcm (the foam at every station)
**Plans:** 23/23 plans complete — LIVE 2026-11-10 as main ff5818c0; verified; the founder’s walk-through (17-UAT.md) passed eight checks, set one aside (the CNC files, being replaced by a .brd export) and found two things to fix (G-17-5 VOLUME’s words, G-17-6 the finished rail rounding the channels). Seven fix plans, 17-17 to 17-23, each approved from before-and-after pictures, went LIVE 2026-11-11 as main 93c0ea8f and he re-checked both on the live site (“Pass all 3”). RAILS now draws every concave (D-41 retired for concaves). Closed 2026-11-11 with five follow-ups filed as to-dos (17-FIXWAVE-REVIEW.md’s three warnings, the production-build browser tests, VOLUME’s ESTIMATE words)

Success criteria:

1. Every one of the eighteen names opens on its starting numbers on each preset, draws its shade, lines, section and DATA rows, and the five vees draw five different sections.
2. A board with every section flat and no channels counts today's litres bit for bit, and no preset card's litres moves.
3. For any cut, VOLUME's litres, the 3D board's surface, the STL's enclosed volume and DATA's stringer-left column agree with the one foam-off function.
4. RAILS works from what the bottom leaves, FINS shows the contour under the fins, and a fin move on FINS carries a tail cut's Deepest At and the channels' Start and Deepest At.
5. A board saved before this phase opens flat with nothing rewritten; a board saved with a bottom reopens exact; a board file carries it.
6. Eight screens everywhere; the phone stack, the sideways phone and the desktop shell pass their browser specs; Metric reads marks in whole millimetres and dims in centimetres; the order form and the Overview Sheet carry the bottom's lines and the templates draw no contour.

Plans:
**Wave 1**

- [x] 17-01-PLAN.md — Today's litres pinned first; the front fins, their toe and the Narrowest outline as board facts; the sketch's own maths run on the app's boards as the golden

**Wave 2** *(blocked on Wave 1 completion)*

- [x] 17-02-PLAN.md — The one foam-off number for a flat, a belly, a vee and a single concave, stations from the nearest tip, the 1/4" floor

**Wave 3** *(blocked on Wave 2 completion)*

- [x] 17-03-PLAN.md — The cut counted in the litres, the 3D board and the CNC files through one seam; flat boards bit for bit

**Wave 4** *(blocked on Wave 3 completion)*

- [x] 17-04-PLAN.md — RAILS works from what the bottom leaves; one bottom in the store, read by every screen (still flat)

**Wave 5** *(blocked on Wave 4 completion)*

- [x] 17-05-PLAN.md — The double concave, the Spiral Vee, the Tri-Plane and the Teardrop's closing; DATA's numbers and the floor flags

**Wave 6** *(blocked on Wave 5 completion)*

- [x] 17-06-PLAN.md — The channels: the sawtooth, the three runs, Longest and Stagger, the fit; real walls in the 3D board and the STL

**Wave 7** *(blocked on Wave 6 completion)*

- [x] 17-07-PLAN.md — Every drawing as pure geometry: the shade and 1/16" lines, the section a gauge reads, the ruler, the ghost, the cartoon, the tile

**Wave 8** *(blocked on Wave 7 completion)*

- [x] 17-08-PLAN.md — TRACER: the BOTTOM screen end to end on one cut (route, nav, tile, Back/Next, panel, drawings, DATA); eight screens everywhere

**Wave 9** *(blocked on Wave 8 completion)*

- [x] 17-09-PLAN.md — Every row of every cut, the Teardrop's tick box, the floor warning, and the CHANNELS block inside TAIL

**Wave 10** *(blocked on Wave 9 completion)*

- [x] 17-10-PLAN.md — The section follows a drag or a tap; Section at, Height, the ruler, the finished rail; DATA's layout marks; the locked board

**Wave 11** *(blocked on Wave 10 completion)*

- [x] 17-11-PLAN.md — GUIDE: nineteen cards drawn from the open board, the founder's words folded in

**Wave 12** *(blocked on Wave 11 completion)*

- [x] 17-12-PLAN.md — The WINGS selector; the bottom saved with the board and in board files, undo, the read-only saved-boards report

**Wave 13** *(blocked on Wave 12 completion)*

- [x] 17-13-PLAN.md — FINS shows the contour under the fins and a fin move carries the stations; BOTTOM all-metric

**Wave 14** *(blocked on Wave 13 completion)*

- [x] 17-14-PLAN.md — BOTTOM on phones: upright, held sideways, finger-sized

**Wave 15** *(blocked on Wave 14 completion)*

- [x] 17-15-PLAN.md — On paper: the order form's BOTTOM CONTOURS page and the Overview Sheet's lines; nothing on the full-size template

**Wave 16** *(blocked on Wave 15 completion)*

- [x] 17-16-PLAN.md — The one go-live: the full gate, the founder's devices and saved boards, one push on his go, a live check

**Fixes from the founder's walk-through (17-UAT.md, his rulings of 2026-11-10) — fix wave 1**

- [x] 17-17-PLAN.md — VOLUME says what its litres count: the INPUTS card ends "Counts the finished rail shape from RAILS and the bottom contours from BOTTOM." and the GUIDE's Import Designed Board card names BOTTOM (G-17-5)
- [x] 17-18-PLAN.md — RAILS draws the channels straight up at every wall, on the thin bottom line and the thick Finished Rail line; RAILS' rail is thinned by a vee or belly alone (G-17-6)
- [x] 17-19-PLAN.md — The litres of 49 channelled boards pinned before the solid board changes, and the "before" pictures (G-17-6)

**Fix wave 2** *(blocked on 17-18 and 17-19)*

- [x] 17-20-PLAN.md — The litres, the 3D board and the CNC files cut the channels straight up into the finished rail, with a real wall under the rail's curve; Hard Edge tails and boards without channels keep their litres; the before-and-after table (G-17-6)

**Fix wave 3** *(blocked on 17-20; the founder's two answers at his look at 17-18, 2026-11-11)*

- [x] 17-21-PLAN.md — "Show channels too": RAILS draws the channels on a flat tail as it does on a vee or belly, cut straight up into the thin bottom line and the Finished Rail, the rail's thickness and band marks untouched; "Match RAILS": BOTTOM's DATA Rail lift counts the vee or belly alone; no litres figure moves (G-17-6)

**Fix wave 4** *(blocked on 17-21; the founder's answers at his look at 17-21 and on 17-22's first plan, 2026-11-11; the two plans share no file and run side by side)*

- [x] 17-22-PLAN.md — "Draw the concave" and "Always draw it": RAILS draws every concave, on the nose, centre and tail sections, channels or not, the channels cut last and straight up into it; the rail's thickness, readout and DATA untouched; no litres figure moves (G-17-6)
- [x] 17-23-PLAN.md — "Match DATA": BOTTOM's section gauge reads the vee's or belly's rail lift alone, on screen and on paper; "Use the sentence": DATA's note in his words; "Make it fit": the Longboard's printed tables sheet prints every note, its rows tighter only where needed; no litres figure moves (G-17-6)

The sixteen plans run one per wave, 1 to 16 in the order listed — the founder's build order (the maths first; the double, spiral vee, tri-plane and teardrop; the channels; the screen as a tracer, then its rows, its viewer, GUIDE, WINGS and saving, FINS and Metric, the phones; the paper; one go-live) — every plan ending with his look at pictures (`autonomous: false`), the next wave starting only after his yes. Planned 2026-11-08; the checker passed with no blockers (five warnings: three fixed in the plans, the tracer's size and the estimates accepted as known hand-back risks).

Cross-cutting constraints: geometry pure and tested in `lib/geometry/bottom.ts` and its companions, every fixture generated by a script that executes the sketch's own maths (`reference/sketches/021-bottom-maths.js`), never a typed figure (Rule 1); every number through `units.ts` / `measure-display.ts` — marks in whole mm, dims in cm, the INPUTS card's Thickness a dim (Rule 2, D-25); one foam-off function read by the litres, the 3D board, the CNC files, RAILS, FINS and every drawing (D-05); a flat bottom bit-identical on the 102-board pin and no preset's litres moving (D-20); one optional snapshot field at version 5, absent means flat, no database change (D-24); width / pointer / height the only three layout switches; each executor in its own worktree with its own PW_PORT (3301–3316) and `IS_WEBPACK_TEST=1`, never touching port 3005 or the founder's checkout; nothing pushed without his go (D-28).

### Phase 18: A GUIDE on Every Page

**Goal:** Every design page teaches itself. TEMPLATE, ROCKER, RAILS, VOLUME and FINS each gain a GUIDE as the last tab of their own strip: one card per control or named choice under the sidebar's headings, named as the page labels the control, with the board's own value beside the name, a cartoon of the board the shaper has open drawn the page's own way with that one setting pushed by a stated amount in muted dashes through the app's own maths, two short sentences and a *How to shape* note. On FINS the cards run setup by setup and carry the MODEL INFO tab's notes, and that tab goes; TEMPLATE's Depth card says it belongs to a diamond or a swallow. Nothing on a card can be pressed and nothing changes the board. 84 cards, their words on one page the founder marks up and the code is tested against.
**Requirements**: R1–R13 (locked in `phases/18-a-guide-on-every-page/18-SPEC.md` from sketch 022 as decided and the founder's rulings, 2026-11-08 to 2026-11-09)
**Brief:** `phases/18-a-guide-on-every-page/18-SPEC.md`; the decided sketch `.planning/sketches/022-page-guides/` (its `index.html` is the five GUIDEs as they will be built); the words `18-GUIDE-WORDS.md`
**Depends on:** Phase 16 (the pages as they stand), quick 261102-gec (the finished rail the RAILS cards draw); Phase 17's GUIDE card dress is copied, not waited for — its branch lands separately and BOTTOM adopts the shared card after
**Plans:** 10/10 plans executed

Plans:
**Wave 1**

- [x] 18-01-PLAN.md — VOLUME's GUIDE from end to end (eight cards), with the card, the cartoon painter, the words held to the founder's page and the units check every other page then uses
- [x] 18-02-PLAN.md — the board's name gives way on a strip with no room for it, never a stub (D-21); ROCKER's captions written onto the words page (D-23)

**Wave 2** *(blocked on Wave 1 completion)*

- [x] 18-03-PLAN.md — TEMPLATE's GUIDE, 22 cards; Depth says it is for diamond and swallow tails only
- [x] 18-04-PLAN.md — ROCKER's GUIDE, 14 cards, last in both of ROCKER's tab rows (computer and phone)
- [x] 18-05-PLAN.md — RAILS' GUIDE, 17 cards, drawn on the finished rail
- [x] 18-06-PLAN.md — FINS' GUIDE setup by setup, 23 cards carrying the 14 Model info notes word for word; the MODEL INFO tab goes
- [x] 18-07-PLAN.md — how a Metric shaper reads the few figures inside the words, all five pages (D-22)

**Wave 3** *(blocked on Wave 2 completion)*

- [x] 18-08-PLAN.md — the five GUIDEs checked together: all 84 cards against the words page, the same rules on every kind of board in both systems, the phone and computer layouts, and a timed run that decides lazy drawing (D-28)

**Wave 4** *(blocked on Wave 3 completion)*

- [x] 18-09-PLAN.md — pictures of every GUIDE for the founder's look, and one paragraph in CLAUDE.md

**Wave 5** *(blocked on Wave 4 completion)*

- [x] 18-10-PLAN.md — the go-live gate: tests, lint, build, the full browser suite, the push to main, the live site confirmed, the founder's look on his phone (D-20)

---

## Progress

**Execution Order:**
Phases execute in numeric order: 1 → 2 → 3 → 4 (v1.0, complete) → 5 → 6 → 7 (v1.1, complete) → 8 → 9 → 10 (v1.2, complete) → 11 (v1.3, complete) → 12 (v1.4, complete) → 13 → 14 (v1.5, in progress) → 15 → 16 → 17 → 18 (18 went live first, 2026-11-10, while 17 was still building on its branch)

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
| 13. Ready for the Shapers | 13/13 items | Complete    | 2026-11-14 |
| 14. Realistic Surfboard Flow | 18/18 | Complete    | 2026-11-14 |
| 15. The Board Rack | 13/13 | Complete    | 2026-10-06 |
| 16. 3D Board and CNC Export | 18/18 | Complete    | 2026-11-06 |
| 17. BOTTOM — Bottom Contours | 23/23 | Complete    | 2026-11-11 |
| 18. A GUIDE on Every Page | 10/10 | Complete    | 2026-11-10 |
