# Milestones

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
