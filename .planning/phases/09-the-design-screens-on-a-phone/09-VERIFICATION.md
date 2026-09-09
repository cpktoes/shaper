---
phase: 09-the-design-screens-on-a-phone
verified: 2026-09-09T19:15:00Z
status: human_needed
score: 7/7 must-haves verified
behavior_unverified: 0
overrides_applied: 0
re_verification:
  previous_status: human_needed
  previous_score: 7/7
  gaps_closed:
    - "G-09-4: keyboard focus was invisible on sliders and barely visible on hand-rolled buttons (found in UAT test 4, 09-08 closes it)"
    - "G-09-6: the phone Print button did nothing when launched from an iOS Home-Screen icon (found in UAT test 6, 09-09 closes it)"
  gaps_remaining: []
  regressions: []
human_verification:
  - test: "On a real iPhone in Safari, open each design screen and scroll the controls so the dynamic toolbar collapses and re-expands."
    expected: "The pinned drawing area is never clipped, the bottom tab bar stays visible, and scrolling never gets trapped."
    why_human: "Playwright's device emulation does not reproduce Safari's dynamic viewport-resize behaviour; the automated suite can only assert the dvh-based height chain and that scrollHeight never exceeds clientHeight, not the real toolbar animation. (PHON-02, carried from every plan in the phase.) UAT test 1 already passed once on this ground; carried forward for completeness since nothing in this wave touched layout."
  - test: "On a real iPhone, tap a typed number field (e.g. Board Length in Metric, a rail mark, a fin placement number)."
    expected: "The page does not zoom in on focus."
    why_human: "iOS's auto-zoom-on-focus behaviour for sub-16px fields is not reproduced by WebKit/Chromium emulation. (PHON-03, 09-05.) UAT test 2 already passed; nothing in this wave touched input sizing."
  - test: "On a real iPhone, press and hold one of the outline's or rocker's drag points for two seconds, then drag."
    expected: "No text-selection callout or magnifier interrupts the drag."
    why_human: "The iOS long-press callout is not emulated by Playwright. (PHON-04, 09-07.) UAT test 3 already passed; nothing in this wave touched drag handling."
  - test: "On a desktop browser at least 820px wide, across all five design screens: Tab to every sidebar control and confirm each one paints an obvious accent-coloured ring — every slider thumb, every tail-shape/fin-setup tile, every pill, every disclosure heading, every Reset Advanced Settings link, every checkbox, every select trigger and every typed field. Then, with the mouse, click every button, drag every slider, press rotate/construction/wide-view, and confirm nothing at rest or under the mouse looks any different from the deployed site."
    expected: "Every control lights up clearly under the keyboard in the same accent-ink strength, in all four themes (Daylight, Chalk, Slate, Phosphor); nothing hovered, dragged, or resting has changed."
    why_human: "This replaces the original UAT test 4, which the founder failed on 2026-09-09 (G-09-4: no visible indicator when tabbing). 09-08 fixed the root cause — the slider ring was keyed on a DIV that Base UI never focuses, and every hand-rolled button had no focus style of its own — and a real Chromium Tab-walk (e2e/keyboard-focus.spec.ts, independently re-run during this verification) now proves a slider thumb and two tail-shape/pill buttons both paint the ring. But no automated test walks all five screens in all four themes, and 'obvious at a glance' is inherently a human judgement; the five pixel-identical desktop baselines (independently re-confirmed, none regenerated) are this wave's own proof that nothing at rest or under the mouse moved. (PHON-05, G-09-4.)"
  - test: "Hold an iPhone-sized phone in hand on the ROCKER screen at the default board and look at the side-profile drawing, which is narrower than the pinned drawing area (about 322x341px measured on an iPhone-14-class screen, versus the pinned area's own width)."
    expected: "The founder confirms the narrower rocker drawing still reads clearly enough in the hand, per D-18's accepted trade-off."
    why_human: "D-18 already accepts this in writing; UAT test 5 already passed. Carried forward for completeness — nothing in this wave touched ROCKER."
  - test: "Two device checks, in place of the original UAT test 6 which failed (G-09-6: 'print buttons dont do anything'). (1) From the site's Home-Screen icon: go to RAILS, tap View Full Sized, and confirm the note — \"Printing isn't available from the Home-Screen app — open this page in Safari to print the full-sized rail.\" — appears exactly where the Print button used to be, with no Print button visible. (2) From Safari itself (not the Home-Screen icon): go to RAILS, tap View Full Sized, confirm the Print button is there, tap it, confirm the print sheet opens, and measure the printed rail with a ruler in both Imperial and Metric."
    expected: "(1) The note appears, no dead button. (2) The Print button works from Safari, the print sheet opens, and the printed rail is ruler-true (1:1) in both unit systems."
    why_human: "09-09's root-cause diagnosis (confirmed on the founder's own device on 2026-09-09) found the tap already reached window.print() correctly — the failure was iOS itself silently no-op'ing print calls from a Home-Screen-launched standalone web app. The fix (a CSS-only display-mode:standalone swap) is proven by two source-contract vitest cases pinning the exact note wording and the no-JavaScript-detection rule (independently re-run, 21/21 pass), and by a real Playwright print-call-counting stub that proves a Safari tap on a phone genuinely calls print exactly once (independently re-run on both iphone and android, both pass). The one thing no test in this environment can prove: the installed Chromium build's CDP does not honour a `display-mode` media-feature override (confirmed empirically by the executor; the test self-detects this and calls test.skip() rather than reporting a false pass — independently re-run, confirms the skip is genuine, not silently hidden), so the actual Home-Screen-launch appearance and the ruler-true printed page both still need the device in hand. (PHON-01, D-13, G-09-6.)"
  - test: "At 360px wide in the Metric system, read the RAILS INSTRUCTIONS tab end to end (the example rail card, the three-step copy, the legend grid, the plan/side figure, the closing note)."
    expected: "Nothing clips, overlaps, or truncates, and the cm-formatted numbers read correctly."
    why_human: "UAT test 7 already passed. Carried forward for completeness — nothing in this wave touched RAILS INSTRUCTIONS."
---

# Phase 9: The Design Screens on a Phone Verification Report

**Phase Goal:** One shared screen shell stacks the five design screens for a narrow screen, with finger-sized controls and outline, rocker and foil points a thumb can drag.
**Verified:** 2026-09-09T19:15:00Z
**Status:** human_needed
**Re-verification:** Yes — after gap closure (09-08, 09-09)

## Context

This is the second verification of Phase 9. The first pass (09-VERIFICATION.md, `human_needed`,
7/7 must-haves) sent the phase to UAT (09-UAT.md), where the founder ran all seven human checks and
found two failures:

- **G-09-4** (UAT test 4, PHON-05): tabbing through sidebar controls gave no visible indicator of
  which control had keyboard focus — sliders painted nothing at all, and the tail-shape tiles were
  "barely" visible.
- **G-09-6** (UAT test 6, PHON-01/D-13): the phone Print button in the View Full Sized dialog "does
  nothing" — later root-caused on the founder's own device to iOS 26 silently no-op'ing
  `window.print()` inside a Home-Screen-launched standalone web app.

Two gap-closure plans (09-08 for G-09-4, 09-09 for G-09-6) were executed in the same wave, merged to
main as commits `8756991` and `8dcd6da`, with tracking updated in `2e37393`. This report re-verifies
both gaps against the actual code and tests on `main` at that HEAD — not against either SUMMARY's
own narration.

## Gap Closure

### G-09-4 (keyboard focus invisible) — CLOSED IN CODE

**Root cause (confirmed):** `components/ui/slider.tsx` painted its focus ring on the thumb `<div>`,
but Base UI 1.7.0 gives real keyboard focus to a visually-hidden `<input type="range">` nested
*inside* that div (clipped by `clip-path: inset(50%)`), so the ring's selector never matched.
Separately, every hand-rolled selection button (tail-shape tiles, FINS pills/grids, RAILS
disclosures) had no focus style of its own, leaving only the browser's automatic outline at the
base layer's half-opacity `outline-ring/50` — measured at 2.18–2.65:1 against the sidebar, under
the palette contract's own 3:1 floor.

**Evidence independently gathered during this verification (not just cited from the SUMMARY):**

- `app/globals.css` carries two new, additive-only rules immediately after the existing
  `.slider-accent` block: `.slider-accent [data-slot="slider-thumb"]:has(:focus-visible)` and
  `.focus-ring-accent:focus-visible`, both a 3px `box-shadow` in `var(--surf-accent-ink)` plus the
  Windows-High-Contrast-safe transparent outline trick. Confirmed by direct read.
- `components/ui/{button,checkbox,input,select}.tsx` each carry `focus-visible:ring-ring` (full
  opacity) in place of `ring-ring/50` — confirmed by grep; each file's diff is exactly one word
  changed (`git show --stat` on the merge commit: `+1/-1` for each of the four files).
- All thirteen hand-rolled buttons across `outline-controls.tsx` (1), `fin-controls.tsx` (9),
  `rail-controls.tsx` (2), `fine-adjust-group.tsx` (1) carry `focus-ring-accent` — confirmed by
  grep, counts match the plan's own must-have exactly.
- `e2e/keyboard-focus.spec.ts` exists (139 lines) and was **independently re-run** during this
  verification on a fresh port: `PW_PORT=3101 npx playwright test --project=desktop
  e2e/keyboard-focus.spec.ts` — 2/2 passed. It Tabs a real Chromium session onto a real slider
  thumb and two real hand-rolled buttons (TEMPLATE's "pin" tile, FINS' "Pin" pill) and reads the
  ring colour live off `--surf-accent-ink`.
- `components/ui/slider.tsx` is untouched (absent from `git diff --name-only a04a5b5 HEAD`), so the
  primitive's own half-strength hover/active ring is provably unchanged.
- The five desktop baseline screenshots were **independently re-run** during this verification
  (`PW_PORT=3101 npx playwright test --project=desktop e2e/desktop-baseline.spec.ts`) — 5/5 passed,
  `git status` on the snapshots directory clean (nothing regenerated).
- `npx vitest run` independently re-run in full: 2311 passed, 2 skipped — matches the orchestrator's
  reported count exactly.

**What remains genuinely human:** whether the ring reads as "obvious at a glance" across all five
screens and all four themes, and a full keyboard/mouse parity walk, are judgement calls no automated
suite makes — this was true before the gap and remains true after; the fix closes the actual defect
(nothing painted at all) and the human item now asks a materially easier question (is the fix
*good enough*, not *does anything paint*).

### G-09-6 (phone Print button does nothing) — CLOSED IN CODE, WITH ONE HONESTLY-FLAGGED LIMITATION

**Root cause (confirmed on the founder's own device, 2026-09-09):** the phone's Print button
correctly called `window.print()` synchronously inside a live tap — the app did its job. The failure
was downstream: the site had been launched from an iOS Home-Screen icon, which iOS 26 opens as a
standalone web app, and `window.print()` is a documented, silent no-op in that context. Typing the
address into Safari itself and tapping Print works.

**Founder's decision:** detect the Home-Screen (standalone) launch in CSS only, and on a phone in
that context replace the Print button with a plain note directing the shaper to open the page in
Safari. No PDF path, no change to the print stylesheet, no change to `window.print()` itself.

**Evidence independently gathered during this verification:**

- `components/rails/view-full-sized-dialog.tsx` gates the Print button, the "turn off Fit to page"
  caveat, and the D-13 line's "tap Print" clause with the same Tailwind arbitrary variant,
  `max-shell:[@media(display-mode:standalone)]:hidden` (4 occurrences, confirmed by grep), and
  shows a new note gated the mirror way. The note's exact text —
  `"Printing isn't available from the Home-Screen app — open this page in Safari to print the
  full-sized rail."` — is present verbatim (confirmed by grep). `window.print()` appears exactly
  once in the file, unchanged. No `navigator.standalone`, no `matchMedia`, no new `useState` —
  confirmed by grep (all zero).
- `components/rails/view-full-sized-dialog.test.ts` was **independently re-run**
  (`npx vitest run components/rails/view-full-sized-dialog.test.ts`) — 21/21 passed, including the
  two new source-contract cases pinning the note's exact sentence and the CSS-only (no-JavaScript)
  detection rule.
- `e2e/phone-rails.spec.ts` was **independently re-run** on a fresh port across all three projects
  (`PW_PORT=3101 npx playwright test e2e/phone-rails.spec.ts --project=iphone --project=android
  --project=desktop`): the Safari tap-and-count case passed on both iphone and android (a stubbed
  `window.print` counter reads exactly 1 after a real tap); the desktop guard passed (button
  visible, note not visible); the android/CDP Home-Screen emulation case genuinely **skipped**
  (shown as `-` in the run, not a pass) rather than reporting a false result.
- Files outside this plan's declared three (`app/design/rails/actual-size.css`,
  `components/summary/use-print-fit.ts`, `components/template/build-template-pdf.ts`,
  `components/rails/rail-section-plot.tsx`, `app/globals.css`) are absent from
  `git diff --name-only a04a5b5 HEAD` for this plan's concern — confirmed the print path itself
  was not touched.

**The known limitation, judged:** the plan called for an android Playwright case that emulates
`display-mode: standalone` via CDP `Emulation.setEmulatedMedia`. The installed Chromium build
(153.0.8010.12) does not honour a `display-mode` feature override in any spelling — confirmed
empirically by the executor (a `prefers-color-scheme` override with the identical call shape
correctly took effect, ruling out a call-syntax mistake). The test detects this at run time and
calls `test.skip()`, verified during this re-verification to be a genuine skip rather than a
hidden pass.

**Judgement on whether this is acceptable for a must-have "proved by a machine":** Acceptable, with
the item routed to human verification rather than treated as an unproven gap, for three reasons.
First, `@media (display-mode: standalone)` is a standard, browser-native CSS media feature — the
same mechanism as `prefers-color-scheme`, which this codebase's print block already depends on
correctly — so the risk surface is "does this browser evaluate a spec'd media query correctly,"
not "does this app's own logic work," and that risk is effectively zero. Second, the actual
mechanism this app owns (the CSS-only gating, the exact note text, the absence of any JavaScript
detection) is fully and independently proven by the source-contract tests and by the identical
`max-shell:`/`print:`/pointer-variant pattern already exercised correctly elsewhere in this same
file and proven by dozens of other passing e2e assertions. Third, the test is honest about its own
limitation — it does not claim to have proven the Home-Screen case, it skips and says why, and the
real on-device confirmation is explicitly on the human-verification list below (item 6) rather than
silently declared "done." This is the same class of gap the phase has carried honestly throughout
(the iOS long-press callout, the dynamic toolbar) — a real device is required to close the loop, and
the SUMMARY and this report both say so rather than paper over it.

## Goal Achievement

### Observable Truths

The seven truths below restate the previous verification's own truths (unchanged where this wave
didn't touch that surface) with #4 (PHON-05/G-09-4) and the print-related portion of #1
(PHON-01/G-09-6) re-verified fresh against the current code, not carried forward from the prior
pass.

| # | Truth | Status | Evidence |
|---|-------|--------|----------|
| 1 | On a phone, each of the five design screens stacks its controls and its drawing so nothing overlaps and nothing is hidden — every control a shaper can reach on a desktop is reachable on the phone (PHON-01), and a phone's View Full Sized dialog never offers a control that silently fails (G-09-6). | VERIFIED | Unchanged layout evidence from the prior pass, still true (DesignScreenShell wiring untouched by this wave). New: the Home-Screen print-button swap is CSS-only, present, and independently re-run passing (source-contract + e2e, see Gap Closure above). |
| 2 | The page fits the phone's visible area as Safari's toolbar comes and goes — nothing clipped, no trapped scrolling — and the board drawings use the full width of the screen (PHON-02, PHON-06). | VERIFIED (code) / human_needed (real toolbar behaviour) | Unchanged from prior pass — this wave touched neither file. |
| 3 | Sliders, buttons, tabs and typed fields are big enough to hit with a finger, and tapping a number field does not zoom the page (PHON-03). | VERIFIED (code) / human_needed (real iOS zoom) | Unchanged from prior pass — this wave touched neither the coarse-sizing rules nor input font sizing (confirmed: `git diff --name-only a04a5b5 HEAD` does not include `components/ui/measure-field.tsx` or the checkbox row files for sizing purposes; the checkbox/input/select edits in this wave are focus-ring-only, one word each). |
| 4 | A shaper can drag outline, rocker and foil points with a thumb: hit zones sized for a finger, not overlapping their neighbours, and no long-press text popup interrupting a drag (PHON-04). | VERIFIED | Unchanged from prior pass — this wave touched no drag-related file. |
| 5 | On a desktop, mouse dragging and keyboard operation behave exactly as they do today on every viewer touched, AND a shaper tabbing through the sidebar can now see which control has focus (PHON-05, G-09-4, TEST-01). | VERIFIED (automated) / human_needed (full visual keyboard walkthrough) | The keyboard-invisibility defect is fixed and independently re-proven: `e2e/keyboard-focus.spec.ts` re-run, 2/2 pass; the five desktop baselines re-run, 5/5 match, none regenerated; `e2e/desktop-regression.spec.ts` and the desktop half of `e2e/touch-sizing.spec.ts` untouched and still relied upon as this wave's own proof nothing moved. Whether the ring reads as obvious at a glance across all screens/themes remains a human call. |
| 6 | `npm run build`, `npm test` and `npm run lint` all stay clean at HEAD (project-level regression gate, applies to every phase). | VERIFIED | Independently re-ran `npx vitest run` in full (2311 passed, 2 skipped — matches orchestrator exactly), `npm run lint` (0 errors, the same 12 pre-existing warnings in unrelated `scripts/` files), `npx tsc --noEmit` (0 errors). `npm run build` was reported clean by the orchestrator on this exact HEAD; not independently re-run here (slow, and nothing found during this verification contradicts it — matches the phase's established practice from the first pass). |
| 7 | The two UAT-reported gaps (G-09-4, G-09-6) are actually fixed in the code, not just narrated in their SUMMARYs. | VERIFIED | See "Gap Closure" section above — every must-have from both 09-08-PLAN.md and 09-09-PLAN.md was independently checked against the current source (grep + read) and independently re-run (vitest + fresh-port Playwright), not read off either SUMMARY's own claims. |

**Score:** 7/7 truths verified (0 present-but-behavior-unverified). Five of the seven truths carry a
real-device or human-judgement caveat that automated checks structurally cannot close — collected
under Human Verification below, consistent with the phase's `workflow.human_verify_mode =
end-of-phase` convention and the founder's own UAT pass.

### Required Artifacts (gap-closure wave only)

| Artifact | Expected | Status | Details |
|----------|----------|--------|---------|
| `app/globals.css` (new rules) | Slider-thumb focus ring + shared `.focus-ring-accent` class, additive only | VERIFIED | Both rules present, read directly; `git diff` on this file for the wave shows 0 deleted lines |
| `components/ui/{button,checkbox,input,select}.tsx` | Full-strength `ring-ring` focus rings | VERIFIED | One word each, confirmed by grep; slider primitive itself untouched |
| `components/{outline/outline-controls,fins/fin-controls,rails/rail-controls,design/fine-adjust-group}.tsx` | `focus-ring-accent` on all 13 hand-rolled buttons | VERIFIED | Counts match exactly (1+9+2(x2 lines)+1) |
| `e2e/keyboard-focus.spec.ts` | Real Chromium Tab-walk proof | VERIFIED | Present, independently re-run, 2/2 pass |
| `components/rails/view-full-sized-dialog.tsx` | CSS-only Home-Screen note swap | VERIFIED | Present, all 4 gating occurrences confirmed, print handler unchanged |
| `components/rails/view-full-sized-dialog.test.ts` | Source-contract cases for note text + no-JS detection | VERIFIED | Present, independently re-run, 21/21 pass |
| `e2e/phone-rails.spec.ts` (additions) | Print-stub proof, CDP Home-Screen case, desktop guard | VERIFIED (with one honestly-skipped sub-case) | Present, independently re-run across all 3 projects; CDP case genuinely skips, not a false pass |

### Key Link Verification (gap-closure wave only)

| From | To | Via | Status | Details |
|------|-----|-----|--------|---------|
| `.slider-accent` (every `<Slider>` in the app) | new `:has(:focus-visible)` thumb rule | shared CSS class | WIRED | One rule reaches every slider; confirmed by grep and by the e2e Tab-walk on TEMPLATE |
| `.focus-ring-accent` | 13 hand-rolled buttons across 4 files | shared CSS class | WIRED | Confirmed by grep count per file; e2e confirms it reached FINS as well as TEMPLATE |
| Print button / note in `view-full-sized-dialog.tsx` | `display-mode: standalone` media feature | Tailwind arbitrary variant | WIRED | Confirmed by grep; e2e desktop guard proves the button, not the note, shows outside that context |

### Behavioral Spot-Checks (gap-closure wave, independently re-run during this verification)

| Behavior | Command | Result | Status |
|----------|---------|--------|--------|
| Source-contract cases for the dialog's note text and CSS-only detection | `npx vitest run components/rails/view-full-sized-dialog.test.ts` | 21/21 passed | ✓ PASS |
| Keyboard-focus Tab-walk (slider + two hand-rolled buttons) | `PW_PORT=3101 npx playwright test --project=desktop e2e/keyboard-focus.spec.ts` | 2/2 passed | ✓ PASS |
| Phone print-stub + Home-Screen CDP case + desktop guard | `PW_PORT=3101 npx playwright test e2e/phone-rails.spec.ts --project=iphone --project=android --project=desktop` | 21 passed, 18 skipped (CDP case genuinely skipped on iphone/android/desktop as designed), 0 failed | ✓ PASS |
| Desktop baselines unmoved by either gap fix | `PW_PORT=3101 npx playwright test --project=desktop e2e/desktop-baseline.spec.ts` | 5/5 matched, none regenerated (`git status` on snapshots dir clean) | ✓ PASS |
| Full unit suite | `npx vitest run` | 45 files, 2311 passed, 2 skipped | ✓ PASS |
| Lint | `npm run lint` | 0 errors, 12 pre-existing warnings (unrelated `scripts/` files) | ✓ PASS |
| Type check | `npx tsc --noEmit` | 0 errors | ✓ PASS |

### Requirements Coverage

| Requirement | Source Plan(s) | Description | Status | Evidence |
|---|---|---|---|---|
| PHON-01 | 09-02, 09-03, 09-04, 09-09 | Every screen stacks, nothing hidden; phone print offers no dead control | SATISFIED | Prior-pass evidence + this wave's Home-Screen note swap, independently confirmed |
| PHON-02 | 09-02 | Page fits phone viewport as toolbar moves | SATISFIED (code) / human check open | Unchanged this wave |
| PHON-03 | 09-05 | 44px-class targets, no zoom on tap | SATISFIED (code) / human check open | Unchanged this wave |
| PHON-04 | 09-06, 09-07 | Thumb drag, no long-press popup | SATISFIED | Unchanged this wave |
| PHON-05 | 09-01, 09-02, 09-05, 09-07, 09-08 (also 09-03, 09-04) | Desktop unchanged; keyboard focus now visible | SATISFIED (automated) / human keyboard walkthrough open | This wave's G-09-4 fix independently re-run and passing; desktop baselines re-confirmed unmoved |
| PHON-06 | 09-02, 09-03, 09-04 | Drawings use full phone width | SATISFIED, with two documented exceptions carried from the prior pass | Unchanged this wave |
| TEST-01 | 09-01, 09-02, 09-07 | Playwright installed, proves layout + touch drag | SATISFIED | Unchanged this wave |

No orphaned requirements. REQUIREMENTS.md marks PHON-01 through PHON-06 and TEST-01 all `Complete`
for Phase 9, and all seven IDs are claimed by at least one of the phase's nine plans' `requirements:`
frontmatter (cross-checked directly against `.planning/REQUIREMENTS.md` during this verification).

### Anti-Patterns Found

None. A targeted scan for `TBD`/`FIXME`/`XXX`, `TODO`/`HACK`/`PLACEHOLDER`, and stub language across
every file this gap-closure wave touched found zero debt markers. The two grep hits on `input.tsx`
and `select.tsx` are the Tailwind utility classes `placeholder:text-muted-foreground` and
`data-placeholder:text-muted-foreground` — false positives on the word "placeholder" inside a CSS
class name, not stub language. `npm run lint` is 0 errors.

### Deferred Items

None new. This wave closed the two items UAT found; it introduced no new deferred concern beyond the
one CDP tooling limitation already judged acceptable above and folded into the human-verification
list (item 6).

### Human Verification Required

Per this task's instruction, two items are replaced from the prior report to reflect what the gap
closures actually changed; the other five are carried forward unchanged because nothing in this wave
touched their surface, and the founder already passed them once in UAT.

1. **Safari's dynamic toolbar (PHON-02).** Unchanged from the prior pass — carried forward.
2. **No zoom on a typed number field, on real iOS (PHON-03).** Unchanged from the prior pass — carried forward.
3. **No long-press popup during a real thumb drag (PHON-04).** Unchanged from the prior pass — carried forward.
4. **Full desktop keyboard walkthrough, now checking that every control shows a visible ring (PHON-05, G-09-4 — REPLACES the prior item and the failed UAT test 4).** Tab through the sidebar of all five design screens and confirm every slider thumb, tail/fin-setup tile, pill, disclosure heading, Reset Advanced Settings link, checkbox, select trigger and typed field shows an obvious accent-coloured ring — and that nothing at rest, on hover, or under a mouse drag looks any different from the deployed site.
5. **ROCKER's narrower-than-full-width drawing, in the hand (D-18).** Unchanged from the prior pass — carried forward.
6. **Two device checks for the phone print path (G-09-6 — REPLACES the prior item and the failed UAT test 6).** (1) From the Home-Screen icon: RAILS → View Full Sized shows the note where the Print button was, with no dead button. (2) From Safari itself: the Print button is there, tapping it opens the print sheet, and the printed rail measures true with a ruler in both Imperial and Metric.
7. **RAILS INSTRUCTIONS at 360px, in Metric.** Unchanged from the prior pass — carried forward.

### Gaps Summary

No blocking gaps. Both UAT-reported failures (G-09-4, G-09-6) are closed in the actual code, not
just narrated in their SUMMARYs — every must-have from both `09-08-PLAN.md` and `09-09-PLAN.md` was
independently checked against source and independently re-run (vitest, and Playwright on a fresh
port distinct from the executors' own worktree ports) during this verification, not accepted on
either SUMMARY's word. The two items the prior verification flagged for the founder's attention
(RAILS' rail drawing at ~80-81% of viewport width at the `<svg>` level, and the Playwright suite not
wired into CI) are unchanged by this wave — neither gap-closure plan touched that area — and remain
open observations rather than blocking gaps, exactly as recorded previously.

The one new item worth calling out honestly: the android/CDP case meant to prove the Home-Screen
print-button swap end-to-end cannot run in this environment (the installed Chromium build doesn't
honour a `display-mode` media-feature override), and the test says so by skipping rather than lying.
This is judged acceptable (see "Gap Closure" above) because the mechanism it would have proven is a
standard browser CSS feature, not app logic, and the app's own contribution (the CSS-only gating, the
exact note, zero JavaScript detection) is fully proven by other means. The actual on-device
confirmation is on the human-verification list (item 6) rather than silently marked done.

Status is `human_needed` rather than `passed` because five human-verification items remain — the
same reason the phase was `human_needed` after the first pass, now with items 4 and 6 answering the
two specific things the founder found broken in UAT.

## Post-review addendum (2026-09-09, after the gap-closure code review)

The gap-closure code review (`09-REVIEW.md`, commit `7aa362c`) found that the Home-Screen print
note was keyed on `display-mode: standalone` alone, which is also true of a desktop Chrome/Edge
"open as window" install and an Android home-screen launch — both of which can print. The fixes
merged in `268384c` (details in `09-REVIEW-FIX.md`, "Gap-closure review fixes") supersede the
G-09-6 evidence above on three points, each re-checked on `main` by the orchestrator after merge:

- **The swap is now iOS-only.** Every standalone condition in `components/rails/view-full-sized-dialog.tsx`
  reads `supports-[-webkit-touch-callout:none]:[@media(display-mode:standalone)]:…` (4 occurrences,
  3 of them also under `max-shell:`); `-webkit-touch-callout` is implemented only by iOS WebKit, so
  the "open this page in Safari" wording is now always true where it shows. The production CSS
  chunk carries two `@supports (-webkit-touch-callout:none)` blocks (one nested under the 820px
  width query, one bare for the D-13 clause) around four `display-mode:standalone` rules.
- **The machine proof is now the compiled stylesheet, not the source text.**
  `components/rails/view-full-sized-dialog.css.test.ts` compiles the exact class chains through the
  app's own `app/globals.css` with `@tailwindcss/node` and asserts the emitted width, `@supports`
  and `display-mode` nesting plus the `display:none`/`display:block` declarations (2 cases, passing
  under `npx vitest run`; 46 files, 2315 passed, 2 skipped after merge).
- **The always-skipping android CDP case is gone** from `e2e/phone-rails.spec.ts` (no
  `newCDPSession`/`setEmulatedMedia` left): with the iOS guard no Chromium build could ever render
  the note, so a permanent skip would have been noise. The Safari print-stub case on both phone
  projects and the desktop guard are unchanged. `e2e/keyboard-focus.spec.ts`'s Tab ceiling is now
  derived from the page's own focusable count (WR-02).

Post-merge gates on `main` at `268384c`: `npm run build` exit 0; `npx vitest run` 2315 passed /
2 skipped; `npm run lint` 0 errors; `PW_PORT=3100 npx playwright test` 101 passed / 85 skipped /
0 failed; the five desktop baseline images matched with none regenerated. Status stays
`human_needed`; human-verification items 4 and 6 are unchanged and remain open in `09-UAT.md`.
