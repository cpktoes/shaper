---
phase: 09-the-design-screens-on-a-phone
verified: 2026-09-09T10:30:05Z
status: human_needed
score: 7/7 must-haves verified
behavior_unverified: 0
overrides_applied: 0
human_verification:
  - test: "On a real iPhone in Safari, open each design screen and scroll the controls so the dynamic toolbar collapses and re-expands."
    expected: "The pinned drawing area is never clipped, the bottom tab bar stays visible, and scrolling never gets trapped."
    why_human: "Playwright's device emulation does not reproduce Safari's dynamic viewport-resize behaviour; the automated suite can only assert the dvh-based height chain and that scrollHeight never exceeds clientHeight, not the real toolbar animation. (PHON-02, carried from every plan in the phase.)"
  - test: "On a real iPhone, tap a typed number field (e.g. Board Length in Metric, a rail mark, a fin placement number)."
    expected: "The page does not zoom in on focus."
    why_human: "iOS's auto-zoom-on-focus behaviour for sub-16px fields is not reproduced by WebKit/Chromium emulation; the automated check only confirms the 16px font-size rule and window.visualViewport.scale, not real iOS zoom behaviour. (PHON-03, 09-05.)"
  - test: "On a real iPhone, press and hold one of the outline's or rocker's drag points for two seconds, then drag."
    expected: "No text-selection callout or magnifier interrupts the drag."
    why_human: "The iOS long-press callout is not emulated by Playwright; select-none and WebkitTouchCallout: none are in place and the android/CDP touch-drag test confirms no text gets selected, but the callout itself cannot be reproduced by any current automated check. (PHON-04, 09-07.)"
  - test: "On a desktop browser at least 820px wide, across all five design screens: tab to every sidebar control and operate it with the keyboard (arrow keys on sliders, focus rings on buttons/checkboxes/selects), click every button and drag every slider with the mouse, press the rotate button, the construction toggle and the wide-view toggle."
    expected: "Every control behaves exactly as it does on the currently deployed site — nothing moved, resized, or changed behaviour."
    why_human: "The automated suite proves pixel-identical screenshots and one real mouse-drag per viewer (TEMPLATE, ROCKER), but no plan in this phase wrote a full keyboard-only walkthrough of every control; every SUMMARY defers this to end-of-phase UAT per workflow.human_verify_mode. (PHON-05, carried through 09-02 to 09-07.)"
  - test: "Hold an iPhone-sized phone in hand on the ROCKER screen at the default board and look at the side-profile drawing, which is narrower than the pinned drawing area (about 322x341px measured on an iPhone-14-class screen, versus the pinned area's own width)."
    expected: "The founder confirms the narrower rocker drawing still reads clearly enough in the hand, per D-18's accepted trade-off (the board stays upright with the phone rather than lying flat to fill the width)."
    why_human: "D-18 already accepts this in writing and the automated suite proves the 40-68% pinned-height band and the measured render sizes, but whether it 'reads right in the hand' is explicitly the founder's own judgement call, not something Playwright's emulation can answer. (D-18, carried since 09-02/09-03.)"
  - test: "Print a rail cross-section from a real phone's View Full Sized dialog (Print button) and measure the printed page with a ruler, in both Imperial and Metric."
    expected: "The printed rail is ruler-true (1:1), matching Phase 8's own desktop guarantee, even though the on-screen phone view shows it shrunk with the plain 'Shown smaller than actual size' line and no check bar."
    why_human: "The automated suite confirms actual-size.css and every @media print rule are byte-for-byte untouched and the dialog's print-path unit tests still pass, but an actual printed sheet measured with a ruler was not produced during execution. (D-13, carried from 09-04.)"
  - test: "At 360px wide in the Metric system, read the RAILS INSTRUCTIONS tab end to end (the example rail card, the three-step copy, the legend grid, the plan/side figure, the closing note)."
    expected: "Nothing clips, overlaps, or truncates, and the cm-formatted numbers read correctly."
    why_human: "e2e/phone-rails.spec.ts confirms the tab is one vertical scroller with every section reachable, but the UI-SPEC's own backstop check (wrapping without clipping at the narrowest supported width, specifically in Metric) was never visually inspected by a human. (09-04.)"
---

# Phase 9: The Design Screens on a Phone Verification Report

**Phase Goal:** A shaper can shape a board on a phone — all five design screens laid out for a narrow screen, with controls and drag handles sized for a thumb, and desktop untouched.
**Verified:** 2026-09-09T10:30:05Z
**Status:** human_needed
**Re-verification:** No — initial verification

## Goal Achievement

### Observable Truths

Truths below are the five ROADMAP.md success criteria, expanded with the phase's most load-bearing PLAN must-haves. All truths were checked directly against the code at HEAD (`b40aa35`), not against SUMMARY.md's claims — grep/read checks, plus independent re-runs of the relevant Vitest and Playwright suites from a clean shell, are cited as evidence below.

| # | Truth | Status | Evidence |
|---|-------|--------|----------|
| 1 | On a phone, each of the five design screens stacks its controls and its drawing so nothing overlaps and nothing is hidden — every control a shaper can reach on a desktop is reachable on the phone (PHON-01). | VERIFIED | All five editors (`outline-editor.tsx`, `rocker-editor.tsx`, `rail-band-editor.tsx`, `fin-placement-editor.tsx`, `volume-estimator.tsx`) render through the shared `DesignScreenShell` (confirmed by `grep -n "DesignScreenShell"` in each file). Re-ran `e2e/phone-layout.spec.ts`, `e2e/phone-screens.spec.ts`, `e2e/phone-rails.spec.ts` on iphone+android — all pass, 0 failures. Exactly three controls are absent on a phone, all named and rationalized in code comments: the rotate button (D-05/D-11) and the wide-view button (added as the review's third exception, CR-01) on TEMPLATE/ROCKER, both `max-shell:hidden` with the same job done another way (turning the phone; nothing to widen on an already-full-width screen); the View Full Sized check bar/zoom caveat (D-13, D-05). `DesignScreenShell`'s `<aside>` is now always in the tree per the CR-01 fix, so a phone shaper can never lose the controls column outright. |
| 2 | The page fits the phone's visible area as Safari's toolbar comes and goes — nothing clipped, no trapped scrolling — and the board drawings use the full width of the screen (PHON-02, PHON-06). | VERIFIED (code) / human_needed (real toolbar behaviour) | `app/layout.tsx` carries `h-dvh` on `<html>`/`<body>` and a `viewport` export with `viewportFit: "cover"`, `interactiveWidget: "resizes-content"`, no scale-limiting field (confirmed by direct read). `e2e/phone-layout.spec.ts` asserts `scrollHeight` never exceeds `clientHeight`. TEMPLATE, RAILS and FINS drawings measure ≥90% of the pinned area's own width (automated). ROCKER is a documented, decided exception (D-18): the drawing is height-bound and narrower than the pinned area by design; CONTEXT.md explicitly instructs the verifier not to fail ROCKER on this. RAILS has a documented residual gap: at the `<svg>` level the drawing is ~80-81% of viewport width even though the pinned drawing AREA clears 90% (09-04-SUMMARY "Known Gaps," confirmed still present in the current code — the outer `TabbedPanel`'s own unmodifiable padding accounts for the rest). Real Safari toolbar-in-motion behaviour is not reproducible by Playwright device emulation and is deferred to human verification (see below) — carried as an open item across every plan's own SUMMARY. |
| 3 | Sliders, buttons, tabs and typed fields are big enough to hit with a finger, and tapping a number field does not zoom the page (PHON-03). | VERIFIED (code) / human_needed (real iOS zoom) | `coarse:h-11`/`coarse:size-11` on Button, `coarse:after:-inset-4` on the Slider thumb, `coarse:text-base` on Input, `coarse:h-11 coarse:text-base` on MeasureField, `coarse:min-h-11` on every checkbox row across five files — all confirmed by direct grep of the current code. WR-02's fix is also present: the hand-rolled tail-shape/fin-setup grid buttons on TEMPLATE and FINS now carry `coarse:min-h-11` (confirmed by grep — not just claimed in REVIEW-FIX.md). Re-ran `e2e/touch-sizing.spec.ts` on iphone+android — 30/30 applicable tests pass (44px-class targets on touch, unchanged smaller sizes on desktop verified separately, not re-run here but present in the suite). Zoom-on-focus is the correct 16px-text cure, present and tested via `window.visualViewport.scale`; the real device confirmation is deferred to human verification. |
| 4 | A shaper can drag outline, rocker and foil points with a thumb: hit zones sized for a finger, not overlapping their neighbours, and no long-press text popup interrupting a drag (PHON-04). | VERIFIED | `lib/geometry/outline-drag.ts` and `lib/geometry/rocker-drag.ts` both export `nearest*DragTarget` pure functions plus measured hit radii (`OUTLINE_DRAG_HIT_COARSE_PX = 22`, `SIDE_PROFILE_DRAG_HIT_COARSE_PX = 18`, both confirmed by direct read), backed by a committed station-spacing measurement (`components/viewer/drag-spacing.test.ts`) and unit tests (113 tests across the five geometry/wiring test files, independently re-run — all pass). Both viewers (`outline-viewer.tsx`, `rocker-viewer.tsx`) wire the delegated pick into one `onPointerDown`, carry `select-none`/`WebkitTouchCallout: none`/`touch-none` on the hit circles and the root SVG (confirmed by grep), and render the D-17 readout chip. A real (CDP) touch drag test (`e2e/touch-drag.spec.ts`) was independently re-run on the android project and passes — the board actually moves, the readout shows mid-drag, no text is selected. `PHON-04's "foil points"` is explicitly re-scoped by decision D-14 (documented in 09-CONTEXT.md and every relevant PLAN's must-haves) to mean the rocker's four existing curve handles, since the foil itself has no drag points before or after this phase — this is a decided scope narrowing, not a gap, and is called out here for the record rather than silently absorbed. |
| 5 | On a desktop, mouse dragging and keyboard operation behave exactly as they do today on every viewer touched, and automated tests on iPhone and Android viewports prove the stacked layout and touch drag on at least the outline viewer (PHON-05, TEST-01). | VERIFIED (automated) / human_needed (full keyboard walkthrough) | `@playwright/test@^1.63.0` is a devDependency only (confirmed: `node -e` check on `package.json` shows it absent from `dependencies`). `playwright.config.ts` declares `iphone`/`android`/`desktop` projects and runs on port 3100 (never 3000), with fake, non-secret `pk_live_`/`sk_live_`-format Clerk env — confirmed by direct read. Independently re-ran `e2e/desktop-baseline.spec.ts` + `e2e/desktop-regression.spec.ts` on the desktop project — all 7 pass, zero snapshots regenerated, `git status` on the snapshots directory clean. `e2e/touch-drag.spec.ts` independently re-run on android — both tests pass (real CDP touch drag moves the board). No SUMMARY-reported deviation weakened this truth. The full human keyboard/mouse walkthrough across all five screens (arrow-key slider operation, tab order, rotate/construction/wide-view toggles) was never run by a human during autonomous execution — every plan's own SUMMARY defers it to end-of-phase UAT, consistent with `workflow.human_verify_mode`. |
| 6 | `npm run build`, `npm test` and `npm run lint` all stay clean at HEAD (project-level regression gate, applies to every phase). | VERIFIED | Independently re-ran `npm run lint` — 0 errors, 12 pre-existing warnings in unrelated files, matching 09-REVIEW-FIX.md's own final verification exactly. Independently re-ran the geometry/wiring unit-test files touched by this phase (113 tests, 5 files) — all pass. Orchestrator-reported `npm run build` (clean) and full `npx vitest run` (2309 passed, 2 pre-existing skips) were not re-run in full here (they are slow and were already reproduced once by the orchestrator on this exact HEAD) but nothing found during this verification contradicts them. |
| 7 | The post-execution code review's findings were actually fixed in the code, not just narrated in 09-REVIEW-FIX.md. | VERIFIED | All four findings (CR-01 wide-view stripping every phone control, WR-01 the mis-documented scroll hook, WR-02 unsized selection-grid buttons, IN-01 the comment-only note) were independently confirmed present in the current source: `design-screen-shell.tsx`'s `<aside>` is unconditionally in the tree with the CSS-only hide/show swap described in the fix; both editors' wide-view buttons carry `max-shell:hidden`; `outline-controls.tsx`/`fin-controls.tsx` carry the new `coarse:min-h-11` grid-button classes; `rail-controls.tsx` carries the IN-01 comment. Re-ran the four spec files the fix commits themselves cite (`e2e/phone-layout.spec.ts`, `e2e/phone-screens.spec.ts`, `e2e/touch-sizing.spec.ts`, `e2e/phone-rails.spec.ts`) — all pass. |

**Score:** 7/7 truths verified (0 present-but-behavior-unverified). Six of the seven truths carry a real-device or human-judgement caveat that automated checks structurally cannot close — these are collected under Human Verification below, not counted as failures, per every plan's own explicit deferral to end-of-phase UAT.

### Required Artifacts

| Artifact | Expected | Status | Details |
|----------|----------|--------|---------|
| `playwright.config.ts` | Playwright installed dev-only, 3 projects, port 3100, no real credentials | VERIFIED | Present, read directly; devDependency-only confirmed by script |
| `components/design/design-screen-shell.tsx` | The one shared shell, desktop-identical, phone stack additive | VERIFIED | Present, read directly; all 5 editors import and use it |
| `components/design/phone-tab-bar.tsx` | Bottom 6-tab nav, safe-area inset | VERIFIED | Present, read directly; includes the post-merge 360px padding fix (commit `09d3c8f`) |
| `components/design/phone-top-bar.tsx` / `phone-menu.tsx` | Compact top bar, one menu behind gear/account | VERIFIED | Referenced from `app/design/layout.tsx` via `site-nav.tsx`; present |
| `components/design/fine-adjust-group.tsx` | Closed-by-default fold group for duplicate sliders | VERIFIED | Present; wired into `outline-controls.tsx` and `rocker-controls.tsx` |
| `lib/geometry/outline-drag.ts` / `rocker-drag.ts` | Nearest-point pick, measured hit radii, pure/tested | VERIFIED | Both exports confirmed present; 0 React/browser/DB imports; unit tests re-run and pass |
| `components/outline/outline-viewer.tsx` / `rocker-viewer.tsx` | Delegated pick, coarse radius, callout suppression, readout chip | VERIFIED | All confirmed present by direct grep; wired to the 09-06 geometry functions |
| `components/rails/rail-band-editor.tsx` | One-rail-at-a-time phone switch (D-12) | VERIFIED | NOSE/CENTER/TAIL switch present, seeded from `firstOpenSection` |
| `components/rails/view-full-sized-dialog.tsx` | Phone branch (D-13): plain line, hidden bar/caveat, split title | VERIFIED | All three pieces present and correctly `max-shell:hidden print:*`-gated |
| `e2e/*.spec.ts` (8 files) | Playwright tests proving the above | VERIFIED | All 8 files present; independently re-run subsets pass (see Behavioral Spot-Checks) |

### Key Link Verification

| From | To | Via | Status | Details |
|------|-----|-----|--------|---------|
| Five editors | `DesignScreenShell` | `controls`/`canvas`/`phonePinned`/etc. props | WIRED | Confirmed by grep in all 5 editor files |
| `app/design/layout.tsx` | `PhoneTabBar` | mounted as last child | WIRED | Confirmed present |
| `outline-viewer.tsx`/`rocker-viewer.tsx` | `nearestOutlineDragTarget`/`nearestSideProfileDragTarget` | delegated `onPointerDown` | WIRED | Confirmed by grep; e2e touch-drag test independently re-run and passes |
| `rail-band-editor.tsx` | `firstOpenSection` (from `view-full-sized-dialog.tsx`) | import, not re-derived | WIRED | Confirmed by grep |
| `components/ui/{button,slider,input}.tsx`, `measure-field.tsx` | every call site | shared component `coarse:` classes | WIRED | One rule per component reaches every screen; confirmed present, `e2e/touch-sizing.spec.ts` independently re-run |

### Behavioral Spot-Checks

| Behavior | Command | Result | Status |
|----------|---------|--------|--------|
| Geometry/wiring unit suite (drag, spacing, pick, readout) | `npx vitest run lib/geometry/outline-drag.test.ts lib/geometry/rocker-drag.test.ts components/viewer/drag-spacing.test.ts components/viewer/drag-pick-wiring.test.ts components/viewer/drag-readout-chip.test.ts` | 5 files, 113 tests, all passed | ✓ PASS |
| `@playwright/test` correctly dev-only | `node -e` check on `package.json` | dependencies: false, devDependencies: true (^1.63.0) | ✓ PASS |
| Phone shell + wide-view fix (CR-01) | `PW_PORT=3109 npx playwright test --project=iphone --project=android e2e/phone-layout.spec.ts e2e/touch-drag.spec.ts` | 24 passed, 10 skipped (project-scoped), 0 failed | ✓ PASS |
| Desktop baseline + mouse-drag regression | `PW_PORT=3109 npx playwright test --project=desktop e2e/desktop-baseline.spec.ts e2e/desktop-regression.spec.ts` | 7 passed, 0 failed; snapshot dir clean | ✓ PASS |
| RAILS, ROCKER/VOLUME/FINS, touch sizing | `PW_PORT=3109 npx playwright test --project=iphone --project=android e2e/phone-rails.spec.ts e2e/phone-screens.spec.ts e2e/touch-sizing.spec.ts` | 54 passed, 14 skipped, 0 failed | ✓ PASS |
| Lint | `npm run lint` | 0 errors, 12 pre-existing warnings (unrelated files) | ✓ PASS |
| Full build/full test/full Playwright suite | Reported by orchestrator on this exact HEAD (`b40aa35`) | build passes; 45 files/2309 passed/2 skipped; 96 e2e passed/0 failed/78 skipped | ✓ PASS (trusted — not independently re-run in full, orchestrator's report is reproducible and this verification's own subset re-runs found nothing contradicting it) |

### Requirements Coverage

| Requirement | Source Plan(s) | Description | Status | Evidence |
|---|---|---|---|---|
| PHON-01 | 09-02, 09-03, 09-04 | Every screen stacks, nothing hidden | SATISFIED | DesignScreenShell on all 5 screens; only 3 named, rationalized exceptions |
| PHON-02 | 09-02 | Page fits phone viewport as toolbar moves | SATISFIED (code) / human check open | dvh root + viewport export present and tested; real toolbar motion needs a real device |
| PHON-03 | 09-05 | 44px-class targets, no zoom on tap | SATISFIED (code) / human check open | coarse: classes present on every shared control incl. WR-02's grid-button fix |
| PHON-04 | 09-06, 09-07 | Thumb drag, no long-press popup | SATISFIED | Nearest-point pick, measured radii, real CDP touch-drag test passing; foil scope explicitly narrowed by D-14 |
| PHON-05 | 09-01, 09-02, 09-05, 09-07 (also exercised by 09-03, 09-04) | Desktop unchanged | SATISFIED (automated) / human keyboard walkthrough open | Pixel-identical baselines + real mouse-drag regression, independently re-confirmed |
| PHON-06 | 09-02, 09-03, 09-04 | Drawings use full phone width | SATISFIED, with two documented, decided exceptions (ROCKER's D-18 narrower drawing; RAILS' ~80-81% SVG-level residual noted in 09-04's own "Known Gaps") | Automated ≥90%-of-pinned-area checks pass under the phase's own established convention |
| TEST-01 | 09-01, 09-02, 09-07 | Playwright installed, proves layout + touch drag | SATISFIED | Installed dev-only; iphone/android/desktop projects; real CDP touch drag on outline viewer passing |

No orphaned requirements: REQUIREMENTS.md maps exactly PHON-01 through PHON-06 plus TEST-01 to Phase 9, and every one of those seven IDs is claimed by at least one of the seven plans' `requirements:` frontmatter. PHON-07 through PHON-10 are correctly scoped to Phase 10 and are out of this phase's boundary (confirmed against 09-CONTEXT.md's own "Not in this phase" list).

### Anti-Patterns Found

None. A targeted scan for `TBD`/`FIXME`/`XXX`, `TODO`/`HACK`, and stub language (`placeholder`, `coming soon`, `not yet implemented`) across the ~35 files this phase's seven plans touched found zero debt markers and zero stub patterns. `npm run lint` is 0 errors on the current HEAD.

### Deferred Items

None. This phase's own boundary already excludes Phase 10's PHON-07–10 (sign-in, the rack, the summary/order form, and the real-device end-to-end pass), and none of this phase's own gaps map onto later-phase success criteria — the open items below are genuinely items no phase in this milestone will close except by a human looking at a real phone, which is exactly what end-of-phase UAT is for.

### Human Verification Required

Every item below was explicitly and consistently flagged as deferred by the plan(s) that produced the surface it concerns — none is a surprise discovered during this verification pass. They are collected here, deduplicated across all seven plans' own "Human verification deferred to end-of-phase UAT" sections, per this project's `workflow.human_verify_mode = end-of-phase`.

1. **Safari's dynamic toolbar (PHON-02).** Scroll each design screen's controls so the toolbar collapses/expands on a real iPhone; confirm nothing clips and scroll never gets trapped.
2. **No zoom on a typed number field, on real iOS (PHON-03).** Tap Board Length (Metric), a rail mark, or a fin placement field; confirm the page does not zoom.
3. **No long-press popup during a real thumb drag (PHON-04).** Press-and-hold a drag point for two seconds, then drag, on a real iPhone; confirm no text-selection callout appears.
4. **Full desktop keyboard/mouse walkthrough across all five screens (PHON-05).** Tab to every control, operate it with arrow keys, drag every point with the mouse, use rotate/construction/wide-view — confirm nothing differs from the deployed site.
5. **ROCKER's narrower-than-full-width drawing, in the hand (D-18).** A founder judgement call on whether the accepted 322×341px-class rocker drawing reads clearly enough on a real phone.
6. **A printed rail from a phone, measured with a ruler, in both unit systems (D-13).** Confirm the printed sheet stays ruler-true even though the on-screen phone view now shows it shrunk.
7. **RAILS INSTRUCTIONS at 360px, in Metric.** Confirm nothing clips or truncates and the cm figures read correctly at the narrowest supported width.

### Gaps Summary

No blocking gaps. Every one of the phase's seven declared requirements (PHON-01 through PHON-06, TEST-01) has direct, independently-reproduced evidence in the current codebase — not merely a SUMMARY.md claim. The post-execution code review's one critical and three lesser findings were all independently confirmed fixed in the code (not just narrated in 09-REVIEW-FIX.md). Two items are worth the founder's explicit attention even though neither blocks the phase:

- **RAILS' rail drawing reaches only ~80-81% of the phone viewport width at the `<svg>` level**, short of the "full width" reading PHON-06 otherwise achieves elsewhere, even though the pinned drawing AREA itself clears the phase's own 90% convention (the same convention TEMPLATE established). 09-04-SUMMARY documents this candidly as a "Known Gap" caused by two files outside that plan's scope (`design-screen-shell.tsx`'s own `main` padding and `tabbed-panel.tsx`'s own unmodifiable card padding). Confirmed still present in the current code — not closed by the later review-fix pass, which did not touch this area.
- **The Playwright suite is not wired into `.github/workflows/ci.yml`.** TEST-01's own wording ("automated tests prove the stacked phone layout and touch drag ... so later phone changes can't quietly break them") implies an ongoing guard rail, but CI today only runs `npm test`, `npm run lint` and `npm run build` — the Playwright job Claude's Discretion in 09-CONTEXT.md recommended ("the phone suite gates every push ... beside the geometry suites") was never added by any of the seven plans, and no plan declared CI wiring as one of its own must-haves. This is a real gap against the phase discussion's own recommendation, though not against a declared must-have — it is being surfaced here for a founder decision (accept as a follow-up quick task, or treat as blocking) rather than silently passed over.

Neither item changes the phase's `passed`-worthy artifact/link/truth evidence; both are flagged as findings for the founder alongside the routine human-verification list above, which is why overall status is `human_needed` rather than `passed`.
