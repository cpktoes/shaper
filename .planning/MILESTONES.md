# Milestones

## v1.5 Ready for the Shapers (Shipped: 2026-11-14)

**Phases completed:** 6 phases (13–18), 82 plans in Phases 14–18 (228 tasks) plus Phase 13's thirteen items, and about 85 quick tasks and 80 fast tasks
**Commits:** 1,643 (2026-09-27 → 2026-11-14) on `main` and the phase branches merged into it (`surfboard-flow`, `board-3d`, `page-guides`, the BOTTOM branches, `close-bottom-17`) · **Code changed:** 704 code files outside the planning folder, the generated fixtures and the baseline pictures: +176,653 / −6,615
**Audit:** none run — closed on each phase's own record: Phase 13's thirteen items in its Progress Log ([13-SPEC.md](milestones/v1.5-phases/13-ready-for-the-shapers/13-SPEC.md)); Phase 14 verified 8 of 9 in code with the two checks left to a person closed at the founder's word ([14-VERIFICATION.md](milestones/v1.5-phases/14-realistic-surfboard-flow/14-VERIFICATION.md)); Phase 15 complete 2026-10-06; Phase 16 verified 11 of 12 requirements in code and confirmed by the founder on iPhone and iPad; Phase 17 verified 6 of 6 success criteria and R1–R15, walked by the founder (10 passed, 1 set aside) with security 37/37; Phase 18 verified 15/15 with the founder's three rulings recorded ([18-VERIFICATION.md](milestones/v1.5-phases/18-a-guide-on-every-page/18-VERIFICATION.md))
**Closeout:** override_closeout — closed at the founder's word on 2026-11-14 ("Both 13 and 14 are complete and can be closed.", then "Yes let's close it and clean everything up."). The pre-close scanner's stale records were settled first (two fixed bug notes filed as resolved, two quick-task records marked complete, Phase 18's open checks ruled or carried); what remains open is the 26 pending to-dos, acknowledged as deferred (see STATE.md Deferred Items).

**Delivered:** The app the founder showed to a room of shapers on 2026-10-10, and everything they and he asked of it in the five weeks after. A shaper now designs a whole board the way it is shaped — TEMPLATE, ROCKER, BOTTOM, RAILS, VOLUME, FINS, SUMMARY, 3D — on curves that flow like real foam, sees it as a solid, prints what the shop needs, carries it out as a file a CNC program opens, and brings a board in from AkuShaper or Shape3D. At the close: 13,687 unit tests and the full browser suite (1,989 passed on a computer and two phones) green on the code that is live as main `ce73ff35`.

**Key accomplishments:**

- **Ready for the room (Phase 13):** the security patch, three milestones of stale records cleared, the founder's open decisions made (the 1/4" floor, Deck Skin none–1", the four preset blanks, fins against the real tail), the order form's PLANING table, a Contact page with support@shaperassistant.com, account deletion, a privacy page with cookie-free visit counts, a friendly error screen and link preview, and the phone's chrome cut to the bone — shown to a room of shapers on 2026-10-10.
- **Curves that flow like a real board (Phase 14):** a blank's bottom, thickness and width drawn between their printed stations by the square-root rule that redraws real blanks most closely, a hand-set board drawn the same way, and a steady taper into each tip from a Thinning Start that is automatic or set by hand — today's numbers pinned from the live commit first, saved boards redrawn with a report of how far each moved.
- **The Board Rack (Phase 15):** "Your Boards" became a rack of boards standing sideways at one true scale, turning their real turn under a cursor or a swipe, reordered by drag or hold-and-slide, the unsaved board always first.
- **The 3D board and its files (Phase 16, then the `.brd` export):** every board as a solid in a shaping room on its own 3D screen, one surface with the litres, with Contour Stripes, a wire view, fins and the blank as switches, a zip of DXF, XYZ and STL for a CNC program, and an AkuShaper / Shape3D `.brd` file with a preview.
- **BOTTOM (Phase 17):** a screen between ROCKER and RAILS where the nose, centre and tail each take a named cut and the tail takes 4, 6 or 8 channels; one foam-off number read by the litres, the 3D board, the files and RAILS; depths under a straightedge and layout marks every 6" on screen and on a printed page.
- **A GUIDE on every page (Phase 18):** 84 cards on TEMPLATE, ROCKER, RAILS, VOLUME and FINS — each the board's own drawing with one setting pushed, two sentences and a How to shape note — and FINS' MODEL INFO folded into them.
- **Between and after the phases, as quick tasks:** Rails v2 (the finished rail and a fuller Advanced menu), wings on TEMPLATE, the blank picker popup with a fourth maker and custom rocker, board files both ways (save, open, import), bottom contours behind the founder's names — and, in the milestone's last two days, opening an AkuShaper or Shape3D `.brd` as a board (outline, rocker, thickness, bottom, wings, rails and fins fitted to the app's own controls), fins in the `.brd` export, and boards from 4'0" to 12'0" and 31" wide.

---

## v1.4 Foil the Way a Shaper Cuts It (Shipped: 2026-09-27)

**Phases completed:** 1 phase (12), 10 plans, 22 tasks
**Commits:** 116 between 2026-09-26 and 2026-09-27 — 73 on branch `foil-real-shaping`, merged to `main` as 125a90f, the rest the phase's opening and close-out and five quick tasks on `main` after the merge · **Code changed:** 132 files, +18,553 / −775 (80 code files outside the planning folder: +8,136 / −746)
**Audit:** none run — closed on the phase's own record: verification 11/11 requirements with 0 gaps ([12-VERIFICATION.md](milestones/v1.4-phases/12-foil-the-way-a-shaper-cuts-it/12-VERIFICATION.md)), UAT 8/8 with the founder ([12-UAT.md](milestones/v1.4-phases/12-foil-the-way-a-shaper-cuts-it/12-UAT.md)), security 35/35 threats closed ([12-SECURITY.md](milestones/v1.4-phases/12-foil-the-way-a-shaper-cuts-it/12-SECURITY.md)), a code review of 56 files with both warnings fixed and three notes ruled into founder questions ([12-REVIEW.md](milestones/v1.4-phases/12-foil-the-way-a-shaper-cuts-it/12-REVIEW.md), [12-REVIEW-FIX.md](milestones/v1.4-phases/12-foil-the-way-a-shaper-cuts-it/12-REVIEW-FIX.md)), production migrated before the merge and walked live ([12-10-SUMMARY.md](milestones/v1.4-phases/12-foil-the-way-a-shaper-cuts-it/12-10-SUMMARY.md))
**Closeout:** override_closeout — Known verification overrides: 17 open artifacts by the scanner's count acknowledged as deferred (see STATE.md Deferred Items): the same 7 debug sessions and 5 quick-task records carried since v1.2, whose work shipped long ago, and the pending todos — ten on the day, three of them filed this milestone. Nothing from Phase 12 itself is open.

**Delivered:** The foil is cut the way a planer works. With a blank picked, a constant Deck Skin comes off the deck first, the bottom is planed parallel to the blank's down to the centre thickness with the foam to remove read as a depth and as planer passes, the four rocker numbers are the blank's own, and the tips are thinned last inside the final 12" with the deck or the bottom pinned — every number on the DATASHEET a number a shaper works to, and every board saved under Phase 11 reopening with its five station thicknesses kept.

**Key accomplishments:**

- **Phase 11's foil pinned, then replaced, before any screen moved:** a golden fixture of 39 Phase 11 boards generated from tag `v1.3`, then six named geometry tests green on every seeded blank — the deck exactly one skin below the blank's deck, the bottom exactly one centre gap above the blank's bottom, each 12" station the blank's thickness there less skin and gap, tip thinning that moves nothing inside the 12" stations and joins them with no kink, and every version-4 board reopening with its five numbers exact — with git ancestry proving the tests landed before the first screen commit.
- **The planer's numbers on the ROCKER screen:** a Deck Skin slider and an OFF BOTTOM column at every station, the passes at the centre counted from the printed numbers against a Planer Max Depth, Tip Style (Pin deck / Bottom) and Fine-tune off (Deck / Bottom) as per-board choices with undo, and the DATASHEET's FOAM OFF block with Deck and Bottom rows, the drawing shading both bands.
- **Fit & Tip Defaults grew to seven:** Planer Max Depth replaced Extra Center Thickness, Deck Skin and Tip Style joined the account (three nullable columns, migration 0006, with a per-browser fallback signed out), the blank list's centre floor became target + skin + one pass in plain words, and every two-way pill got a keyboard focus ring, a pressed state for screen readers and a finger-sized height on touch.
- **The fit check learned the planer's limits:** at least one pass under the centre wherever the board sits (D-15), a board that would run under 1/8" thick anywhere refused with its own reason line (D-18), a "runs out" reason where the foil crosses the blank, and a Deck fine-tune bigger than the skin flagged with a Reset Fine-Tune offer instead of a dead end (review WR-01).
- **Every older board still opens:** saved boards moved to version 5 with the cut travelling on the blank; a Phase 11 board is recognised by its blank's shape, never its version stamp, opens with the shaper's own Tip Style on every server path, and keeps its five station numbers exactly — proven by a read-only script on the development database and again on production (10 of 10 boards open, 1 of 1 Phase 11 board kept).
- **Shipped in a day:** 10 plans in 5 waves, a code review with both warnings fixed in the same session, 2,984 unit and 332 browser tests green at verification with the desktop baselines byte-identical after the one permitted ROCKER re-record, production migrated BEFORE the merge under the expand-first rule, and the founder's eight UAT checks passed on real phones and the live site.

---

## v1.3 Rocker from Real Blanks (Shipped: 2026-09-26)

**Phases completed:** 1 phase (11), 13 plans, 33 tasks
**Commits:** 106 between 2026-09-25 and 2026-09-26 on branch `rocker-blanks`, merged to `main` as 2d05668 · **Code changed:** 150 files, +24,455 / −3,044 (95 code files outside the planning folder and the seeded data: +12,008 / −3,020)
**Audit:** none run — closed on the phase's own record: verification 16/16 requirements with 0 gaps ([11-VERIFICATION.md](milestones/v1.3-phases/11-rocker-from-real-blanks/11-VERIFICATION.md)), UAT 7/7 with the founder ([11-UAT.md](milestones/v1.3-phases/11-rocker-from-real-blanks/11-UAT.md)), security 43/43 threats closed ([11-SECURITY.md](milestones/v1.3-phases/11-rocker-from-real-blanks/11-SECURITY.md)), six live checks on production ([11-13-SUMMARY.md](milestones/v1.3-phases/11-rocker-from-real-blanks/11-13-SUMMARY.md))
**Closeout:** override_closeout — Known verification overrides: 17 open artifacts acknowledged as deferred (see STATE.md Deferred Items): 7 old debug sessions and 5 quick-task records whose work shipped in earlier milestones, and 5 pending todos including the three filed this milestone.

**Delivered:** The ROCKER screen stopped being a hand-drawn curve. A shaper sets a target centre thickness, picks a real foam blank that fits from three vendor catalogues, slides the board along it, and reads the board's rocker, thickness and foil off where it sits in that foam — live, on desktop and phone, with every blank that won't fit listed with why, and older saved boards reopening unchanged.

**Key accomplishments:**

- **The blank maths, proven before any screen:** PCHIP interpolation matching SciPy, a catalogue reader that fails loudly on a bad cell and never stores 0, levelling that puts every blank's low point at exactly 0, the board sitting on the blank at a placement, a fit check at every point (thickness envelope plus a width margin), and a foil scaled to the centre thickness with eased tips — with the brief's four named tests green first.
- **162 real blanks in the database:** US Blanks, Arctic Foam and Marko Foam catalogues loaded as-is from three CSVs by a re-runnable seed with a read-only check, read by a query that cannot break the page, 158 of them pickable.
- **The ROCKER screen rebuilt around the blank:** centre thickness first, a searchable blank list that names why each blank won't fit and offers the closest that will, a placement slider with the four rocker numbers and the foam to remove live, tip thicknesses as settings, 12" fine-tunes, and the board drawn inside its blank with the foam to be planed shaded.
- **Fit & Tip Defaults on the account:** five preferences (Extra Length, Extra Center Thickness, Width Margin, Nose Tip, Tail Tip) in the gear menu, saved on the account with a per-browser fallback, applied to a new board until it is first edited.
- **Every older board still opens:** saved-board snapshots moved to version 4 with the blank travelling with the board; boards from before the phase reopen hand-set with four rocker sliders; presets start in real (provisional) blanks.
- **Proven on both phones, the desktop and production:** 2,865 unit tests and 293 browser tests green, no network request while sliding, the ROCKER and VOLUME desktop screenshots re-recorded once; then production migrated and seeded BEFORE the deploy under the new expand-first database rule, and six live checks passed.

---

## v1.2 Rails Finished, Phone Ready (Shipped: 2026-09-12)

**Phases completed:** 3 phases (8–10), 29 plans, 75 tasks
**Commits:** 486 between 2026-09-06 and 2026-09-12 · **Code changed:** 156 files, +19,105 / −871
**Audit:** passed — 18/18 requirements, 5/5 seams, 3/3 flows ([milestones/v1.2-MILESTONE-AUDIT.md](milestones/v1.2-MILESTONE-AUDIT.md))
**Closeout:** override_closeout — Known verification overrides: 16 open artifacts acknowledged as deferred (see STATE.md Deferred Items); PHON-10 closed on the iPhone alone (Android walk skipped, founder decision D-12); the account avatar's tap target proven in compiled CSS, not on a phone.

**Delivered:** The rails screen got the third tab the prototype always promised, and the whole app — sign-in, the rack, all five design screens, saving, the summary — now works in a shaper's hand on a real phone, with a desktop mouse seeing nothing change.

**Key accomplishments:**

- **The RAILS screen finished:** an INSTRUCTIONS tab naming every mark on a live example rail, a Flat/Domed toggle, "View Full Sized" at true 1:1 on screen, a plan-and-side reference showing where each section sits, and the sheet foldable into the printed order form — with 112 pages of PDF output proven byte-identical when the box is unticked.
- **One shared screen shell for all five design screens on a phone:** drawing pinned above scrolling controls, a slim top bar and a six-tab bottom bar below the 820px width switch, every control sized for a thumb under a separate touch-pointer switch, and the desktop proven unchanged by five committed screenshot baselines.
- **Drag under a finger:** outline, rocker and foil points with measured hit zones, nearest-point-wins picking, a readout card that follows the thumb and stays off the board.
- **Playwright as the phone's proof:** iPhone, Android and desktop projects, a production-build suite that catches what the dev server's StrictMode hides, and compiled-CSS contract tests for what a browser cannot emulate.
- **Everything around the design screens on a phone:** the rack's dialogs, the account controls and the home screen sized for a thumb; a board-card picture with a floor it can never fall below; the rails instructions page without its sliders; the drawing column scrolling on a short screen.
- **Two real-phone sweeps that overrode the plans:** a real iPhone sideways is ~844 dots, not the emulator's 750; the founder's own verdict that a phone on its side is better as a normal browser (D-10) reversed a shipped fix; three code-review rounds fixed every finding that could reach a shaper.

---
