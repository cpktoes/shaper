# Milestones

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

