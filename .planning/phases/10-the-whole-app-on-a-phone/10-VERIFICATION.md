---
phase: 10-the-whole-app-on-a-phone
verified: 2026-09-12T00:00:00Z
status: passed
score: 12/12 must-haves verified (2 by founder-accepted override)
behavior_unverified: 0
overrides_applied: 2
overrides:
  - must_have: "The whole trip runs end to end on a real iPhone AND a real Android phone (SC4 / PHON-10)"
    reason: "The iPhone half is complete — all ten sweep steps PASS, with the one real finding (RAILS drawing column not scrolling on a short screen) fixed in 0eecec0 and pinned by a test. The Android phone was never walked. Offered three routes (fix then walk Android; walk Android now, fix after; fix and close on the iPhone alone), the founder chose the third, with the consequence stated plainly at the time: PHON-10's own wording names both phones, so it closes on one phone's evidence (D-12, 10-SWEEP-2.md, 2026-09-12)."
    accepted_by: "Chris Kontoes (founder)"
    accepted_at: "2026-09-12"
  - must_have: "Clerk's avatar tap target is provably at least 44x44 dots in a real, signed-in session (D-05)"
    reason: "The sweep's five-tap question asked the shaper to tap 'a finger-width out from its rim' — but the implemented target's tappable ring is only ~2mm wide against an ~8mm fingertip, so a tap that far out is supposed to miss on a correct AND a broken implementation alike. The question cannot separate the two cases, and the founder's own walk confirmed this ('avatar only opens when touched, felt good' is recorded as a pass on use, not proof of a 44-dot target). What IS proven: a compiled-CSS test shows the coarse:p-2! padding rule ships and outranks an ordinary rule. What remains unsettled by any instrument available in this repo: whether Clerk's own injected rule for the same element is itself flagged !important, in which case it would still win. 10-08-SUMMARY.md names the fix (read computed styles off a real, signed-in Clerk button) as follow-up work, not a blocker for this phase."
    accepted_by: "Chris Kontoes (founder)"
    accepted_at: "2026-09-12"
re_verification:
  previous_status: gaps_found
  previous_score: "5/10"
  gaps_closed:
    - "Gap 1 (SC1/PHON-07 — sign in, sign up, account menu): the Clerk avatar's coarse:p-2! important fallback shipped (10-07) and is compiled-CSS proven; sign-up, sign-in and the account menu were all walked and PASS on a real iPhone (10-SWEEP-2.md second walk, 2026-09-12)."
    - "Gap 2 (SC2/PHON-08 — preset pick and rack actions): the board card's height cap became a viewport-relative share with a 220px floor instead of a fixed 387px pixel cap (10-06, 10-09); the rack's rename/duplicate/delete actions were walked and PASS on a real iPhone (steps 5a/5b/5c)."
    - "Gap 3 (SC4/PHON-10 — the whole trip end to end on both phones): the ten-step table was walked to completion, twice, on the iPhone (first walk found three more real faults and stopped by decision; second walk PASSED all ten steps). The Android column was deliberately not walked — see the override above, not treated as an open gap."
    - "Gap 4 (a phone held sideways stays in the phone layout): 10-05 tried a width-and-height switch; a real phone in hand showed that was wrong for a different reason (the desktop shell sideways is actually what a shaper wants — D-10) and 10-10 reverted the switch to width alone (820px), matching real hardware (a sideways iPhone is ~844px, a sideways Pixel 7 ~863px, both correctly over 820)."
    - "Gap 5 (CLAUDE.md's Layout section): rewritten twice more since the last verification (10-05, 10-10, and again in 0eecec0 for the RAILS scroll fix) and now matches the app that exists — verified by direct reading of the file at HEAD."
    - "Gap 6 (the site-nav overflow fix had no regression test): e2e/site-nav-width.spec.ts now exists (10-07), and its own header discloses the one real limitation a later code review found (WR2-01 — it measures Clerk's loading placeholder, not the real signed-in control, and says so plainly)."
  gaps_remaining: []
  regressions: []
---

# Phase 10: The Whole App on a Phone — Verification Report (second pass)

**Phase Goal:** Everything around the design screens works on a phone too, and the whole trip — sign in, pick a board, shape it, save it, read the summary — is proven in a shaper's hand on real phones.
**Verified:** 2026-09-12
**Status:** passed
**Re-verification:** Yes — after gap closure (plans 10-05 through 10-11, three rounds of a real-device sweep, three code reviews, and one same-day fix commit)

## Goal Achievement

This phase **achieves its goal, on an iPhone, with one accepted and clearly documented exception: the Android phone was never put in a shaper's hand.**

The first verification pass (2026-09-11) found the phase's own decisive test — a real shaper, on a
real iPhone and a real Android phone, walking the whole trip — had not been completed and had found
three real defects. Since then: four fixes closed those defects and the six verification gaps
(plans 10-05 through 10-08); the shaper then walked a rebuilt app on a real iPhone and found three
*more* real faults that the emulator-based work could not have caught (the board picture collapsing
to nothing sideways, the RAILS controls sitting under every tab, the Hide Toolbar tip still not
appearing); three more fixes closed those (plans 10-09, 10-10, 10-11); a second code review caught
one more real gap in that work (RAILS' sideways behaviour depended on a layout rule a sibling plan
had just reverted); the shaper walked the twice-fixed build on a real iPhone a second time and
passed all ten steps, finding exactly one more thing — the RAILS drawing column didn't scroll on a
short screen — which was fixed the same day and is now pinned by a test. Every one of those rounds
is real: each fix traces to a specific, quoted sentence from the shaper holding an actual phone, not
to a screenshot or an emulator's guess.

**What is genuinely not proven:** the Android phone. Offered the choice — fix now and walk Android
later, walk Android before fixing, or close the sweep on the iPhone alone — the founder chose the
third option, aware at the time of choosing that PHON-10's own wording asks for "a real iPhone and a
real Android phone." That is a founder decision, not an oversight, and it is treated here as an
accepted limitation (see the override above), not a gap sent back to planning. What specifically
remains unproven on Android: sign-up/rename keyboard behaviour, the account menu's long-press
handling, turning sideways and back on the design screens, and that the Hide Toolbar tip correctly
stays absent (10-08-SUMMARY.md, "Follow-up Required").

### Observable Truths

| # | Truth | Status | Evidence |
|---|-------|--------|----------|
| 1 | SC1/PHON-07 — sign in, sign up and use the account menu on a phone | ✓ VERIFIED | Real iPhone, second walk (2026-09-12): "1-10 all good" covers sign-up (step 1), sign-in (step 2) and the account menu (step 3), all PASS. The avatar's `coarse:p-2!` fallback ships and outranks an ordinary rule (compiled-CSS proof, `nav-auth-control.test.ts`); the exact 44-dot claim is not separately provable by any real-phone test (see override 2), and the founder's own use of it "felt good." |
| 2 | SC2/PHON-08 — pick a preset, and rename/duplicate/delete a saved board from the rack, on a phone | ✓ VERIFIED | Real iPhone, second walk: steps 4, 5a, 5b, 5c and 8 all PASS. The card's height cap is now `max(220px floor, 75% of the visible scroller)` (10-06, 10-09) instead of a fixed 387px; the founder confirmed in the hand: "220 dots seem great." |
| 3 | SC3/PHON-09 — read the summary and the on-screen order form on a phone | ✓ VERIFIED | Real iPhone, both walks: "summary screen looks pretty good both V and H" (first walk); step 9 PASS (second walk). Unaffected by any code change in this phase; also confirmed across four quick tasks on 2026-09-10, including phone printing. |
| 4 | SC4/PHON-10 — the whole trip runs end to end on a real iPhone AND a real Android phone | ✓ PASSED (override) | iPhone: all ten sweep steps PASS on the second walk, with the one finding (RAILS scroll) fixed same-day in `0eecec0` and pinned by a test. Android: not walked — founder's explicit call (D-12, 10-SWEEP-2.md), consequence stated at the time. See override 1. |
| 5 | A phone held sideways behaves the way a shaper actually wants, not the way an emulator predicted | ✓ VERIFIED | 10-05 tried width-and-height (a phone stays a "phone" sideways); a real phone in hand said the opposite was better ("It was honestly better when it was treated as a normal browser"); 10-10 reverted to width alone (820px), matching measured real hardware (iPhone ~844px, Pixel 7 ~863px, both correctly ≥820). Confirmed in `app/globals.css` and `components/design/shell-variant.css.test.ts` at HEAD. |
| 6 | CLAUDE.md's Layout section correctly documents phone-width, pointer and short-screen behaviour | ✓ VERIFIED | Read directly at HEAD: three switches (width→layout, pointer→sizing, height→short-screen scroll/beside-or-beneath), with the corrected real-hardware widths and the reason 750px was wrong, and the RAILS scroll fix's own consumer of the height rule. No stale claim found. |
| 7 | The mid-phase site-nav overflow fix (`5dae1f1`) has a standing regression test | ✓ VERIFIED | `e2e/site-nav-width.spec.ts` exists (10-07); its own header now states the current width-only rule (not the withdrawn width-and-height one, per WR-01's fix) and plainly discloses the one real limitation a later review found — it measures Clerk's loading placeholder, not the real signed-in control (WR2-01, disclosed rather than hidden). |
| 8 | The board picture can never collapse to zero, on any screen | ✓ VERIFIED | A real phone found it could (a fixed 205px of card text subtracted from a shrinking budget, no floor). `app/globals.css`'s `--setup-card-thumb-min-h: 220px` composed with `max(floor, share)` makes a non-positive result structurally impossible; `e2e/phone-setup-landscape.spec.ts` asserts a 40×150 CSS px floor at three sideways viewports. Founder confirmed the resulting size in the hand: "220 dots seem great." |
| 9 | RAILS' INSTRUCTIONS tab doesn't show controls that don't act on it, on an upright phone | ✓ VERIFIED | `rail-band-editor.tsx` wraps the controls in `max-shell:hidden` on the INSTRUCTIONS tab only; `e2e/phone-rails.spec.ts` proves the heading is hidden there and visible on VIEWER/DATA, on both phone projects. |
| 10 | RAILS' sideways behaviour (controls beside the reading, same bucket as a desktop mouse) is a decision, not an oversight, and the shaper accepts it | ✓ VERIFIED | A code review (CR-01) caught that D-10 had silently moved a sideways phone into the same bucket as a desktop mouse, where the INSTRUCTIONS fix's gate can't fire — this was then documented explicitly in `rail-band-editor.tsx`'s own comment and pinned by tests at 844×390/863×360. The founder's own sideways-RAILS walk then confirmed the layout itself was fine ("layout fine; missing scroll — see finding") — the only thing sideways RAILS needed was the scroll fix below, not a different control-visibility rule. |
| 11 | The RAILS drawing column scrolls on a short (sideways-phone) screen instead of clipping unreachable content | ✓ VERIFIED | Read `git show 0eecec0` directly: an unconditional scroll was tried and reverted because it moved the RAILS/VOLUME desktop screenshot baselines; the shipped fix gates the scroll on `[@media(max-height:500px)]` (the same rule `fin-viewer.tsx` already uses), so it can never reach a real desktop window. `e2e/phone-rails.spec.ts`'s new test measures the real `scrollHeight`/`scrollTop` of the drawing column at a real 844×390 viewport and proves the previously-unreachable Tail section becomes reachable after scrolling. `npx vitest run` (2463 passed, 2 skipped) and `npx tsc --noEmit` both clean at HEAD, confirmed by this verification directly, not taken on the fixer's word. |
| 12 | The shaper's own decisions (D-08 superseded, D-10, D-12, the 220px floor) are recorded honestly, with what they do and don't settle | ✓ VERIFIED | `10-SWEEP-2.md` records both walks in the shaper's own words, including two cells marked "inferred" rather than answered directly, and states plainly, for each of the four requirement IDs, what is and isn't evidenced — "No requirement is marked here" and "No claim below rests on an automated test standing in for a real phone." |

**Score:** 12/12 truths verified (2 carried by an explicit, founder-accepted override; 0 present-but-behavior-unverified)

### Required Artifacts

| Artifact | Expected | Status | Details |
|----------|----------|--------|---------|
| `app/globals.css` | `max-shell`/`shell` variants, width-only (820px), post-D-10 | ✓ VERIFIED | Explicit `@custom-variant` blocks, one width condition each, confirmed by `shell-variant.css.test.ts` |
| `components/design/shell-variant.css.test.ts` | compiled-CSS proof the switch reads width alone, and the tip's own class compiles to a pointer+iOS gate | ✓ VERIFIED | Present, passes (`npx vitest run` confirms) |
| `components/setup/card-thumbnail.tsx` | `coarse:max-h-(--setup-card-thumb-max-h)`, floor + share composed in `app/globals.css` | ✓ VERIFIED | Present at line 86; doc comment names the known tablet trade-off (WR-02) honestly |
| `components/design/toolbar-tip.tsx` | gate moved to `coarse:`, tip's own wording untouched | ✓ VERIFIED | Confirmed by 10-10's own non-vacuity check and code review |
| `components/rails/rail-band-editor.tsx` | wrapper hides controls on INSTRUCTIONS, upright phone only, with the sideways case documented | ✓ VERIFIED | Present at line ~236-255, comment names CR-01 explicitly |
| `components/design/design-screen-shell.tsx` | drawing column scrolls under `[@media(max-height:500px)]`, phone stack untouched | ✓ VERIFIED | Read via `git show 0eecec0`; phone branch explicitly carries `max-shell:overflow-visible` so it stays byte-identical |
| `e2e/phone-rails.spec.ts` | INSTRUCTIONS hidden/visible test, sideways CR-01 test, sideways scroll test | ✓ VERIFIED | All three present; scroll test asserts real `scrollHeight > clientHeight` and Tail-section reachability, not a class-name check |
| `e2e/site-nav-width.spec.ts` | standing regression test for the nav-row overflow fix, Clerk-placeholder limitation disclosed | ✓ VERIFIED | Present; header discloses WR2-01 plainly |
| `CLAUDE.md` | Layout section matches the app that exists, including the RAILS scroll fix | ✓ VERIFIED | Read directly at HEAD |
| `10-SWEEP-2.md` | both tables filled, no blank cell, iPhone answers in the shaper's own words, Android marked "still unwalked" | ✓ VERIFIED | Confirmed by direct reading; every Android cell explicitly says "still unwalked (D-12...)" |

### Key Link Verification

| From | To | Via | Status | Details |
|------|-----|-----|--------|---------|
| `app/globals.css`'s width-only switch | ~90 `max-shell:`/`shell:` call sites | inherited, unedited | ✓ WIRED | Call-site counts recorded before/after in 10-05/10-10 SUMMARYs; only the two deliberate pointer-migration sites (card cap, tip) moved off it |
| `components/design/design-screen-shell.tsx`'s new scroll rule | RAILS' three sections | `[@media(max-height:500px)]:overflow-y-auto` on `<main>` | ✓ WIRED | `e2e/phone-rails.spec.ts`'s new test measures the real element, not a class string |
| `10-SWEEP-2.md`'s ten steps | requirement IDs PHON-07/08/09/10 | the summary's own per-requirement section | ✓ WIRED (honestly, with a named exception) | 10-08-SUMMARY.md states which rows evidence which requirement and says outright that PHON-10 "closes on one phone's evidence, by the founder's explicit call" |
| the RAILS sideways finding (CR-01) | the founder's actual sideways RAILS walk | the sweep's own named question | ✓ WIRED | The exact question the review raised ("is [controls beside reading] fine, or should they get out of the way sideways too?") was asked in the sweep and answered "layout fine" |

### Requirements Coverage

| Requirement | Source Plan(s) | Description | Status | Evidence |
|--------------|----------------|-------------|--------|----------|
| PHON-07 | 10-01, 10-02, 10-04, 10-07, 10-08 | Sign in, sign up and use the account menu on a phone | ✓ SATISFIED | Real iPhone, steps 1-3 PASS (second walk). Wording says "a phone," singular — satisfied by one real phone. |
| PHON-08 | 10-01, 10-03, 10-04, 10-06, 10-09, 10-08 | Pick a preset and open, rename, duplicate or delete a saved board from the rack, on a phone | ✓ SATISFIED | Real iPhone, steps 4, 5a, 5b, 5c, 8 PASS (second walk). Wording says "a phone," singular — satisfied. |
| PHON-09 | 10-04, 10-08 | Read the summary and the on-screen order form on a phone | ✓ SATISFIED | Real iPhone, step 9 PASS both orientations (second walk); also proven on 2026-09-10 across four quick tasks. |
| PHON-10 | 10-04, 10-05, 10-08, 10-09, 10-10, 10-11 | The whole flow works end to end on a real iPhone AND a real Android phone | ✓ SATISFIED (override) | iPhone: all ten steps PASS, one finding fixed and pinned by a test. Android: explicitly not walked — a founder decision (D-12), not an oversight, recorded here as an accepted deviation from the requirement's literal wording rather than a defect. |

No orphaned requirements: all four IDs declared across the phase's plans match exactly the four IDs REQUIREMENTS.md maps to Phase 10. **REQUIREMENTS.md correctly still shows all four as Pending** — this report recommends the orchestrator mark PHON-07, PHON-08 and PHON-09 Complete on this evidence, and mark PHON-10 Complete-with-a-recorded-exception (or Complete, at the founder's discretion, given the founder already made and stated the choice that produces this exact evidence gap) — the verifier does not mark REQUIREMENTS.md itself.

### Anti-Patterns Found

No debt markers (`TBD`/`FIXME`/`XXX`), no unresolved `TODO`/`HACK`, and no stub returns were found in any file touched since the last verification (`app/globals.css`, `components/design/*.tsx`, `components/setup/card-thumbnail.tsx`, `components/rails/rail-band-editor.tsx`, `components/auth/nav-auth-control.tsx`, `components/site-nav.tsx`, `CLAUDE.md`, and the touched `e2e/*.spec.ts` files). References to "placeholder" in `nav-auth-control.tsx` and `e2e/site-nav-width.spec.ts` are legitimate descriptions of Clerk's own loading-state UI, not stub code.

| File | Line | Pattern | Severity | Impact |
|------|------|---------|----------|--------|
| `components/setup/card-thumbnail.tsx` | 60-70 | A documented, accepted trade-off (WR-02): the card cap's `coarse:` gate also reaches touch tablets in the desktop-shell width band at modest heights, squeezing a board picture ~32% shorter than its aspect ratio wants at a worked 1024×600 example — no test exercises this case | ⚠️ Warning | Out of this phase's core scope (phones, not tablets); documented in the file's own doc comment as a conscious, accepted consequence of the pointer-based gate, not an oversight. Recommend a follow-up test if a shaper ever reports it on a real tablet. |
| `e2e/phone-toolbar-tip.spec.ts` | 165-183 | IN-01 (10-REVIEW-3.md): a comment claims the pointer gate protects a mouse at exactly 819px, but the adjacent test only exercises 1280px | ℹ️ Info | Cosmetic — the underlying claim is true, the comment oversells what that specific assertion demonstrates. No functional risk. |

### Behavioral Spot-Checks

| Behavior | Command | Result | Status |
|----------|---------|--------|--------|
| Full unit/geometry suite still green at HEAD | `npx vitest run` | 59 files, 2463 passed, 2 skipped, 0 failed | ✓ PASS |
| Types still clean at HEAD | `npx tsc --noEmit` | exits 0, no output | ✓ PASS |
| RAILS scroll fix's own scroll behavior | inspected `git show 0eecec0`'s test directly (not re-run — Playwright full suite skipped per orchestrator instruction, machine load) | asserts real `scrollHeight > clientHeight`, `scrollTop` changes, Tail section reachable after scroll | ✓ PASS (by code inspection; independently re-run by the fixer twice green, and once more by the orchestrator on `main`) |
| Full Playwright suite | not re-run in this verification (orchestrator instruction — 6+ minute run, machine reported unstable) | Fixer: 2 full runs, 226/215/0 both times. Orchestrator on `main`: 225/215/1 (one 30s timeout on a Summary-screen spec the change cannot reach, during a load-250-500 spike; passes 12/12 alone at normal load). Desktop screenshot baselines unchanged throughout, confirmed by `git status` on `e2e/*-snapshots/` in the fixer's own SUMMARY. | ✓ PASS (by the two independent runs already on record; not re-verified live in this pass per explicit instruction) |

### Probe Execution

Not applicable — this phase has no `scripts/*/tests/probe-*.sh` files and none are declared in any plan or SUMMARY.

### Human Verification Required

None. The two items that cannot be settled by any test in this repository (the Android phone; the avatar's exact 44-dot proof) are already resolved by explicit founder decision, not left open for a fresh human check — see the two overrides above. Nothing in this report asks the founder or a shaper to do anything further before this phase can be considered done.

### Gaps Summary

**No gaps remain.** All six gaps from the first verification pass are closed, tracing to specific
commits and specific quoted moments of a shaper holding a real phone (see `gaps_closed` in the
frontmatter above). Three code-review rounds (10-REVIEW, 10-REVIEW-2, 10-REVIEW-3) each found real
issues in the gap-closure work itself, and all of the critical/warning findings that could affect a
shaper's real experience were fixed in the same round they were found:

- 10-REVIEW's findings → fixed by 10-05/10-06/10-07's own follow-on work.
- 10-REVIEW-2's WR2-01 (Clerk-placeholder disclosure) and WR2-02 (the card cap's single source of
  truth) → both closed, confirmed by direct reading of the current files.
- 10-REVIEW-3's CR-01 (RAILS sideways) → resolved by explicit documentation plus the founder's own
  sideways-RAILS walk confirming the layout is fine. WR-01 (stale site-nav-width.spec.ts comment) →
  fixed, confirmed by direct reading. WR-02 (touch-tablet edge case) → consciously accepted and
  documented, not fixed — carried forward as a warning above, not a gap, since it sits outside this
  phase's phone-only scope. IN-01 → cosmetic, no action required, as the reviewer itself concluded.

The one item that remains genuinely un-walked — the Android phone — is not treated as a gap because
the founder was offered the choice to walk it and explicitly declined, with the consequence for
PHON-10 stated at the moment of choosing (D-12, 10-SWEEP-2.md, 2026-09-12). Overriding it here
matches the instruction this verification was run under: report it plainly as an accepted,
documented limitation, not as unfinished work to send back to planning.

---

*Verified: 2026-09-12*
*Verifier: Claude (gsd-verifier)*
