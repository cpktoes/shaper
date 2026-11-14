# Roadmap: Shaper

## Overview

Shaper started from a working prototype (built in Claude Design) that already proved out the two "secret sauce" calculators — rail band and fin placement — but lived outside the codebase as a single self-contained page. **Milestone v1.0 (Phases 1–4, complete 2026-08-29)** ported that prototype into a real Next.js app and got it live with accounts and saving, proved the geometry math trustworthy and extended it to volume and printable templates, then built the rocker and foil editors as first-class interactive tools. A shaper can now log in, shape a full board design (outline, rocker, rail, foil, fins), see live-calculated rail band dimensions, fin placement and volume, save it as a named model, and print a full-size template to cut foam from — all of it in inches and litres.

**Milestone v1.1 (Phases 5–7, complete 2026-09-06)** gives the shaper a choice. Every board is already stored in millimetres, so this is presentation work: a units chooser in the settings menu, one set of metric formatters and parsers beside the imperial ones in `lib/geometry/units.ts`, and then every place a number is shown — roughly 300 of them across about 25 files — reading the shaper's chosen system instead of assuming inches. It lands in three passes a shaper can see and try one at a time: the chooser itself proving out on the setup screen, then the five design screens, then everything that comes out of a printer.

**Milestone v1.2 (Phases 8–10, complete 2026-09-12)** finishes what the prototype started and takes the app off the desk. The rails screen has always been missing its third tab — the INSTRUCTIONS page that names every mark on a rail cross-section and lets a shaper flip the example between Flat and Domed — along with a 1:1 on-screen view to hold against the foam, a plan and side reference showing where each section sits on the board, and an option to fold that instructions sheet into what gets printed. None of it needs new geometry: the prototype's `halveDeckMark1` flag turned out to be dead code, so the rail-band calculator already in `lib/` draws the example rail exactly as the reference did. The second half is phone work, and it is not polish — the five design screens carry zero responsive breakpoints today, so the phone layout is built from scratch and touch-first: one shared screen shell instead of five copies of the same sidebar-and-canvas layout, drawings that fill the screen, and drag handles on the outline, rocker and foil curves sized for a thumb. It lands in three passes: rails first (the smaller, self-contained port), then the design screens on a phone (where touch drag lives), then everything around them — sign-in, presets, the rack and the summary — walked end to end on a real iPhone and a real Android phone.

**Milestone v1.3 (Phase 11, complete 2026-09-26)** takes the rocker off the drawing board and puts it in real foam. The ROCKER screen stopped being a hand-drawn curve: a shaper sets a target centre thickness, picks a real blank that fits from the US Blanks, Arctic Foam and Marko Foam catalogues (162 blanks seeded from `db/seed/blanks/`, 158 pickable), slides the board along it, and the board's rocker, thickness and foil are read off where it sits in that foam — the four rocker numbers and the foam to remove live, every blank that won't fit listed with why, five Fit & Tip Defaults on the account, and older saved boards reopening hand-set. One phase of thirteen plans, planned, executed, reviewed, verified, walked by the founder and shipped to production in a day and a half.

**Milestone v1.4 (Phase 12, complete 2026-09-27)** models the foil the way a shaper actually cuts it. Phase 11 scaled the blank's thickness profile down to the centre thickness; a shaper does something else with a planer: skins the deck by a roughly constant amount, planes the bottom down to thickness, and only then thins the tips. The founder's brief put that on the screen — a deck skin taken off parallel to the blank's deck, the bottom planed down to centre thickness with the foam to remove shown as planer passes, a bottom curve parallel to the blank's rocker, and tip thinning in the last 12" with a pin-deck or bottom choice — so the DATASHEET's numbers became the numbers a shaper works to. One phase of ten plans, opened on branch `foil-real-shaping` the afternoon v1.3 shipped and live the next morning: production carried migration 0006 before the merge (`125a90f`), the founder passed all eight UAT checks on real phones and the live site, and every one of the phase's 35 declared threats is closed.

**Milestone v1.5 (Phases 13–18, complete 2026-11-14)** got the app ready for a room of shapers and then built what the room asked for. Phase 13 made it safe, tidy and credible for the founder's showing on Saturday 2026-10-10: the security patch, the founder's open decisions, the order form's planer table, a contact page, a privacy page and a link preview. Phase 14 redrew every curve by the rule that follows real foam most closely and ran each tip down in a steady taper. Phase 15 turned "Your Boards" into the Board Rack. Phase 16 drew the board as a solid in a shaping room and exported it for a CNC program. Phase 17 added BOTTOM, where a shaper maps, measures and cuts bottom contours. Phase 18 put a GUIDE on every page. Between and after the phases, quick tasks added Rails v2, wings, the blank picker with a fourth maker and custom rocker, board files both ways, the AkuShaper / Shape3D `.brd` export, and in the last two days opening a `.brd` as a board and boards from 4'0" to 12'0". Going public with tiered subscriptions (the build guide's M5) is the next milestone.

## Milestones

- ✅ **v1.0 — the design tool, in inches** — Phases 1–4 (shipped 2026-08-29)
- ✅ **v1.1 — Imperial vs Metric** — Phases 5–7 (shipped 2026-09-06)
- ✅ **v1.2 — Rails Finished, Phone Ready** — Phases 8–10 (shipped 2026-09-12)
- ✅ **v1.3 — Rocker from Real Blanks** — Phase 11 (shipped 2026-09-26)
- ✅ **v1.4 — Foil the Way a Shaper Cuts It** — Phase 12 (shipped 2026-09-27)
- ✅ **v1.5 — Ready for the Shapers** — Phases 13–18 (shipped 2026-11-14)

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

**Milestone v1.5 — Ready for the Shapers (complete)**

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

### Milestone v1.5: Ready for the Shapers (Phases 13–18, complete 2026-11-14)

Shipped — six phases over seven weeks: Phase 13's thirteen items run one at a time as quick tasks, then 82 plans
in Phases 14–18, with about 85 quick tasks and 80 fast tasks between and after them. The app was shown to a room
of shapers on 2026-10-10 (the build guide's M4) and kept growing from what was heard. Phase 13 (Ready for the
Shapers): the security patch, housekeeping, the founder's open decisions, the order form's PLANING table, the
Contact page and domain email, account deletion, a privacy page with cookie-free visit counts, a friendly error
screen, and the phone's chrome minimised; item 9 (catalogue links) closed unbuilt. Phase 14 (Realistic Surfboard
Flow): the square-root rule on every blank and hand-set curve and a steady taper into each tip from a Thinning
Start, live 2026-10-02 in two go-lives. Phase 15 (The Board Rack): boards standing sideways at one scale, turning
their real turn, reordered by the shaper, live 2026-10-06. Phase 16 (3D Board and CNC Export): the board as a
solid on its own 3D screen and a zip of DXF, XYZ and STL, live 2026-11-06. Phase 17 (BOTTOM): named cuts for
nose, centre and tail and 4, 6 or 8 channels, one foam-off number read everywhere, live 2026-11-10 with seven
walk-through fixes the next day. Phase 18 (A GUIDE on Every Page): 84 cards on five pages, live 2026-11-10.
Outside the phases: Rails v2, wings, the blank picker and custom rocker, board files both ways, the `.brd`
export, and on 2026-11-13/14 opening an AkuShaper or Shape3D `.brd` as a board, fins in the `.brd` export, the
tail rail's new default and boards from 4'0" to 12'0" — live as main `ce73ff35` after the full gate and a code
review. No milestone audit was run; each phase closed on its own record, and Phases 13 and 14 were closed at the
founder's word. Full phase detail archived in
[`.planning/milestones/v1.5-ROADMAP.md`](milestones/v1.5-ROADMAP.md); requirements in
[`.planning/milestones/v1.5-REQUIREMENTS.md`](milestones/v1.5-REQUIREMENTS.md); phase artifacts in
[`.planning/milestones/v1.5-phases/`](milestones/v1.5-phases/).

## Progress

**Execution Order:**
Phases execute in numeric order: 1 → 2 → 3 → 4 (v1.0, complete) → 5 → 6 → 7 (v1.1, complete) → 8 → 9 → 10 (v1.2, complete) → 11 (v1.3, complete) → 12 (v1.4, complete) → 13 → 14 → 15 → 16 → 17 → 18 (v1.5, complete; 18 went live first, 2026-11-10, while 17 was still building on its branch)

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
