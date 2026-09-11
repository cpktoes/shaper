---
phase: 10-the-whole-app-on-a-phone
verified: 2026-09-11T00:00:00Z
status: gaps_found
score: 5/10 must-haves verified
behavior_unverified: 0
overrides_applied: 0
gaps:
  - truth: "A shaper can sign in, sign up and use the account menu on a phone (SC1 / PHON-07)"
    status: failed
    reason: "Clerk's avatar tap-target fix could not be confirmed on a real phone (\"unsure, looks the same to me\" — treated as a fail by the plan's own pre-authorised rule), and sign-up and the account menu were never separately walked on a real device. Only the sign-in leg is proven in hand."
    artifacts:
      - path: "components/auth/nav-auth-control.tsx"
        issue: "coarse:p-2 passed to Clerk's appearance.elements.userButtonTrigger is unverified in the real, runtime-injected Clerk stylesheet — the pre-authorised fallback (coarse:p-2! important variant) has not been applied"
    missing:
      - "Apply the pre-authorised coarse:p-2! fallback to nav-auth-control.tsx and re-measure the real .cl-userButtonTrigger in a genuine signed-in session"
      - "Walk sign-up and the account menu (Units/Theme rows) on a real iPhone and Android and record PASS/FAIL"
  - truth: "A shaper can pick a preset and open, rename, duplicate or delete a saved board from the rack, on a phone (SC2 / PHON-08)"
    status: failed
    reason: "The real-device sweep found the board card is 'way too tall — even vertical, the boards are bigger than the screen,' contradicting the automated measurement this phase shipped (550px card, 608px visible, 1.11 cards fitting). The rack's own actions — rename, duplicate, delete — were never walked on a real, signed-in phone session at all (not among the reported results)."
    artifacts:
      - path: "components/setup/card-thumbnail.tsx"
        issue: "max-shell:h-[387px] is a fixed pixel cap, not viewport-relative — it reads correctly on the emulator's assumed screen height but the shaper's real device disagrees"
    missing:
      - "Make the card's height cap viewport-relative (~75% of visible height, the shaper's own decision from this sweep) so it holds in both orientations by construction"
      - "Walk the rack's rename/duplicate/delete actions on a real, signed-in iPhone and Android"
  - truth: "The whole trip — sign in, pick a preset, open from the rack, work through all five design screens, save, read the summary — runs end to end on a real iPhone and a real Android phone (SC4 / PHON-10)"
    status: failed
    reason: "The sweep explicitly failed this: three real defects were found (Clerk avatar tap size inconclusive, board card too tall in both orientations, sideways-iPhone tab placement wrong), and the ten-step table was not filled in row by row — only the four named questions plus sign-in were reported. Steps 3 (account menu), 4 (preset pick, partially), 5 (rack actions), 6 (all five design screens via the tab bar), 8 (save) and 10 (return home, sideways two-up) remain unwalked on real hardware."
    artifacts: []
    missing:
      - "Complete the remaining rows of 10-SWEEP.md's ten-step table on both real phones after the four gap-closure fixes land"
  - truth: "A phone held sideways stays in the phone layout (the assumption 10-03's landscape test and D-08's ruling were built on)"
    status: failed
    reason: "A real iPhone held sideways measures ~844px wide, crossing the app's width < 820px 'is this a phone' rule into the desktop shell. e2e/phone-setup-landscape.spec.ts asserts the opposite using Playwright's emulated 750px iPhone-14-landscape viewport, which the code review (WR-03) separately flagged as now stating a disproven fact without correction."
    artifacts:
      - path: "app/globals.css"
        issue: "--breakpoint-shell: 820px is a pure width check with no height/pointer escape hatch, confirmed still in place at HEAD"
      - path: "e2e/phone-setup-landscape.spec.ts"
        issue: "header comment still states '750px wide (stays in the phone stack)' as fact about a real iPhone, per code review WR-03, uncorrected as of this verification"
    missing:
      - "Change the shell breakpoint logic to width < 820px OR (coarse pointer AND height < 500px), per the shaper's own decision recorded in 10-SWEEP.md and 10-04-SUMMARY.md"
      - "Correct e2e/phone-setup-landscape.spec.ts's header comment (code review WR-03) and CLAUDE.md's Layout section (see below) in the same change"
  - truth: "CLAUDE.md's Layout section correctly documents phone-width behaviour"
    status: failed
    reason: "CLAUDE.md still states 'a sideways iPhone stays in the phone layout ... 750 on an iPhone 14' as settled fact. The real-device sweep proved this figure came from Playwright's emulated device, not hardware, and is wrong — a real iPhone sideways is ~844px and currently crosses into the desktop shell. The file has not been corrected."
    artifacts:
      - path: "CLAUDE.md"
        issue: "Layout section's sideways-iPhone width figure (750px) is the specific number the sweep disproved; still present at HEAD"
    missing:
      - "Update CLAUDE.md's Layout section once the height-aware breakpoint fix lands, matching what 10-04-SUMMARY.md's Follow-up Required item 1 promises"
  - truth: "The site-nav overflow fix that shipped mid-phase (5dae1f1) has a standing regression test"
    status: failed
    reason: "Code review WR-01: the fix (site-nav.tsx's px-6 lg:px-12 / gap-4 lg:gap-5) closed a real, measured 51px/7px horizontal overflow at the 820-870px band, but no test in the suite checks nav-row width at that band — e2e/phone-setup-landscape.spec.ts tests 750px (below the shell breakpoint, where SiteNav is hidden), and phone-trip.spec.ts's scrollWidth check runs at portrait viewports only. A future change to any nav item could reopen the same overflow with nothing to catch it."
    artifacts:
      - path: "components/site-nav.tsx"
        issue: "no scrollWidth/boundingBox regression test exists at 820-870px width for this element, per code review WR-01"
    missing:
      - "Add a scrollWidth-vs-viewport (or nav-row boundingBox) assertion at 820px and at a landscape phone width above it (844 or 863px), on a route where SiteNav renders"
human_verification:
  - test: "Re-walk 10-SWEEP.md's ten-step table on a real iPhone and a real Android after the four agreed gap-closure fixes land, filling every remaining blank cell (steps 3, 5, 6, 8, 10 in particular)"
    expected: "Every row PASS or an honest FAIL/N/A; the four named questions (avatar tap size, iOS keyboard, sideways two-up, sideways tab placement) re-confirmed against the fixed code"
    why_human: "Real-thumb hit-size, a real Clerk avatar, and how a card 'reads' on a physical screen cannot be verified by an emulator or a grep"
---

# Phase 10: The Whole App on a Phone Verification Report

**Phase Goal:** Everything around the design screens works on a phone too, and the whole trip — sign in, pick a board, shape it, save it, read the summary — is proven in a shaper's hand on real phones.
**Verified:** 2026-09-11
**Status:** gaps_found
**Re-verification:** No — initial verification

## Goal Achievement

This phase did **not** achieve its goal. The four wave-1 plans built and automatically proved a set
of correct, well-targeted touch-sizing fixes (dialog close-X, typed fields, the account row and
avatar padding, the banner's dismiss X, hiding the tab bar on the home route, and a shared,
height-capped board thumbnail). All of that automated work is real, is wired, and is genuinely
tested — the code review found 0 critical issues and confirmed the extraction, route logic and
Clerk usage are all sound. But the phase's own decisive test — a real shaper, on a real iPhone and
a real Android phone, walking the whole trip — found three failures, and did not even complete the
walk. That is exactly what SC4 (PHON-10) requires, and it is exactly what did not happen.

**This verification does not soften that finding.** The gaps below match, nearly item for item, the
"Follow-up Required" list already agreed with the shaper in `10-04-SUMMARY.md` — this report adds
two items that list does not yet cover (a missing regression test for a mid-phase overflow fix, and
the fact that the sweep itself was never completed row-by-row, only the four named questions were
answered) and confirms the rest are the right and complete set.

### Observable Truths

| # | Truth | Status | Evidence |
|---|-------|--------|----------|
| 1 | SC1 — sign in, sign up, use the account menu on a phone | ✗ FAILED | Real device: sign-in "works great" (PASS). Avatar tap size "unsure, looks the same to me" — treated as a fail per the plan's own pre-authorised rule; sign-up and the account menu were never separately reported. |
| 2 | SC2 — pick a preset, rename/duplicate/delete a saved board from the rack, on a phone | ✗ FAILED | Real device: "way too tall. Even vertical, the boards are bigger than the screen" — contradicts the automated 550px/608px-visible measurement this phase shipped. Rack rename/duplicate/delete never walked on a real signed-in phone. |
| 3 | SC3 — read the summary and the on-screen order form on a phone (printing overtaken) | ✓ VERIFIED | Confirmed on a real iPhone across four quick tasks on 2026-09-10 (ROADMAP.md planning note), including phone printing (quick task 260910-2ny); this phase made no code changes to the summary/order-form screens, so nothing here is newly at risk. |
| 4 | SC4 — the whole trip runs end to end on a real iPhone and a real Android phone | ✗ FAILED | `10-SWEEP.md` "Results — sweep run 2026-09-11": three real failures found (avatar, card height, tab placement); the ten-step table itself was not filled row by row. |
| 5 | Assumption: a phone held sideways stays in the phone layout | ✗ FAILED | Real iPhone sideways measures ~844px, crossing the app's `width < 820px` rule into the desktop shell — "the app treats screen WIDTH under 820px as its stand-in for 'this is a phone'" (10-SWEEP.md). |
| 6 | D-05 — Clerk's avatar hit area actually grows in a real signed-in session | ✗ FAILED (inconclusive, treated as fail) | Plan's own instruction: "a shaper cannot measure a tap target by eye, so 'looks the same' is not evidence the fix landed." Pre-authorised `!important` fallback not yet applied. |
| 7 | D-03 — the iOS keyboard does not cover the rename / name-a-board field | ✓ VERIFIED | Real device: "works great." |
| 8 | Sign-in works on a real phone | ✓ VERIFIED | Real device: "Sign in works great." |
| 9 | CLAUDE.md's Layout section correctly describes sideways-phone width behaviour | ✗ FAILED | Still reads "863 dots wide on a Pixel 7, 750 on an iPhone 14" and claims both "stay in the phone layout" — the sweep proved the 750px figure came from an emulator, not hardware, and is wrong; file unedited at HEAD. |
| 10 | The mid-phase site-nav overflow fix (`5dae1f1`) has a standing regression test | ✗ FAILED | Code review WR-01: no test checks nav-row width at the 820-870px band where the bug occurred; grep confirms no `scrollWidth`/`820`/`863` assertion against `SiteNav`'s own `<nav>`. |

**Score:** 5/10 truths verified (0 present-but-behavior-unverified)

### Required Artifacts

| Artifact | Expected | Status | Details |
|----------|----------|--------|---------|
| `components/ui/dialog.tsx` | close button carries `coarse:size-11` | ✓ VERIFIED | Present at line 72, `size="icon-sm"` retained |
| `components/ui/input.tsx` | base class carries `coarse:h-11` beside `coarse:text-base` | ✓ VERIFIED | Present at line 19 |
| `components/ui/input.css.test.ts` | source + compiled-CSS proof | ✓ VERIFIED | Exists, cited by code review as passing |
| `e2e/phone-dialogs.spec.ts` | measures sign-in dialog + replace-board confirm | ✓ VERIFIED | Exists; part of the 207-passing full suite per orchestrator run |
| `components/auth/nav-auth-control.tsx` | Sign-in row, placeholder, Clerk `appearance` prop all coarse-gated | ✓ VERIFIED (code), ✗ FAILED (real-device proof) | Code present at lines 31-63; the Clerk prop's real-world effect is what the sweep could not confirm |
| `components/auth/nav-auth-control.test.ts` | source + compiled-CSS contract | ✓ VERIFIED | Exists, cited by code review as passing (12/12 with `input.css.test.ts`) |
| `components/auth/sign-in-banner.tsx` | dismiss X grows via fixed-square + overflow margin | ✓ VERIFIED | Present at line 108, `-my-1.5`/`coarse:-my-3` |
| `e2e/phone-account.spec.ts` | measures Sign-in row + banner dismiss X | ✓ VERIFIED | Exists |
| `components/design/phone-tab-bar.tsx` | hides bar on exact home route | ✓ VERIFIED | `pathname === HOME_ROUTE` at line 42, exact-equality confirmed |
| `components/setup/card-thumbnail.tsx` | shared thumbnail, `max-shell:h-[387px]` cap | ✓ VERIFIED (code), ✗ FAILED (real-device proof) | Present at line 55; the fixed 387px cap is exactly what the sweep found too tall in the hand |
| `components/setup/preset-card.tsx`, `board-rack-card.tsx` | both import shared `CardThumbnail` | ✓ VERIFIED | Confirmed by code review's extraction check — no third copy left behind |
| `e2e/phone-home.spec.ts`, `e2e/phone-setup-landscape.spec.ts` | tab-bar inversion + card measurements | ✓ VERIFIED (as automated tests) | Exist and pass, but per WR-03 the landscape spec's own docstring states a figure (750px) the phase's later real-device finding disproved |
| `e2e/phone-trip.spec.ts` | machine walk of the signed-out trip | ✓ VERIFIED | Exists, passes on both phone projects per `10-04-SUMMARY.md` |
| `10-SWEEP.md` | device-by-step sheet, filled | ⚠️ PARTIAL | Exists; the four named questions plus sign-in are filled and decisive, but the ten-step table itself is not filled row by row — "Treat any row of the ten-step table not mentioned below as still unwalked" (10-SWEEP.md's own text) |

### Key Link Verification

| From | To | Via | Status | Details |
|------|-----|-----|--------|---------|
| `components/ui/dialog.tsx` close button | every `Dialog` (rename, name-board, sign-in) | shared component | ✓ WIRED | One edit, confirmed by code review |
| `components/ui/input.tsx` | `measure-field.tsx`, `rename-dialog.tsx`, `board-name-prompt.tsx` | shared base class | ✓ WIRED | Confirmed by code review; WR-02 notes the "exactly three consumers" test doesn't actually grep for a fourth, a minor proof gap, not a wiring failure |
| `Clerk's appearance.elements.userButtonTrigger` | the real `.cl-userButtonTrigger` button | direct prop, no wrapper | ✓ WIRED (structurally) / ✗ UNPROVEN (behaviorally) | Code review confirms no wrapper and a static class literal; the real, runtime-injected Clerk stylesheet is exactly what could not be confirmed to yield the padding in the hand |
| `components/design/phone-tab-bar.tsx` | `app/page.tsx`, `app/design/layout.tsx` | both mount points, neither edited | ✓ WIRED | `git diff --stat` reported no change per 10-03-SUMMARY, confirmed by code review |
| `components/setup/card-thumbnail.tsx` | `preset-card.tsx`, `board-rack-card.tsx` | shared import | ✓ WIRED | Confirmed by code review, no duplicate markup left |
| `10-SWEEP.md`'s ten steps | `10-RESEARCH.md`'s "Real-Device Sweep" | verbatim carry-over | ✓ WIRED (as written) / ✗ INCOMPLETE (as executed) | Sheet exists correctly; execution stopped short of all ten rows |

### Requirements Coverage

| Requirement | Source Plan(s) | Description | Status | Evidence |
|--------------|----------------|-------------|--------|----------|
| PHON-07 | 10-01, 10-02, 10-04 | User can sign in, sign up and use the account menu on a phone | ✗ NOT SATISFIED | Sign-in proven in hand; sign-up, account menu and the avatar's real tap size are not — REQUIREMENTS.md correctly still shows this Pending |
| PHON-08 | 10-01, 10-03, 10-04 | User can pick a preset and open, rename, duplicate or delete a saved board from the rack, on a phone | ✗ NOT SATISFIED | Card sizing found too tall in the hand; the rack's own dialog actions were never walked on a real signed-in phone |
| PHON-09 | 10-04 | User can read the summary and the on-screen order form on a phone | ✓ SATISFIED | Verified across four quick tasks on 2026-09-10 on a real iPhone, including phone printing; unaffected by this phase's code changes |
| PHON-10 | 10-04 | The whole flow works end to end on a real iPhone and a real Android phone | ✗ NOT SATISFIED | The phase's own decisive test explicitly failed this — three real defects, incomplete ten-step walk |

No orphaned requirements: all four IDs declared across the four plans' frontmatter match exactly the four IDs REQUIREMENTS.md maps to Phase 10.

### Anti-Patterns Found

No debt markers (`TBD`/`FIXME`/`XXX`), no stub returns, and no hardcoded-empty-data patterns were found in any file this phase modified (`dialog.tsx`, `input.tsx`, `phone-tab-bar.tsx`, `nav-auth-control.tsx`, `sign-in-banner.tsx`, `card-thumbnail.tsx`, `preset-card.tsx`, `board-rack-card.tsx`, `site-nav.tsx`). The three warnings from `10-REVIEW.md` (WR-01, WR-02, WR-03) are proof-gap issues, not stubs or bugs, and are folded into the gaps above (WR-01) or noted for completeness (WR-02, WR-03 — the latter is folded into the gap about the sideways-iPhone assumption).

| File | Line | Pattern | Severity | Impact |
|------|------|---------|----------|--------|
| `components/site-nav.tsx` | n/a | mid-phase fix with no regression test at the band it fixed | ⚠️ Warning | See gap 6 above (WR-01) |
| `e2e/phone-setup-landscape.spec.ts` | 4-7 | docstring states a figure (750px) this same phase later disproved | ⚠️ Warning | See gap 4 above (WR-03) |
| `components/ui/input.css.test.ts` | 96-107 | test name promises a completeness check ("exactly the three known consumers") its body doesn't perform | ℹ️ Info | Cosmetic — doesn't affect the shipped fix, does mean a future fourth consumer wouldn't be caught by this test |

### Human Verification Required

### 1. Complete the real-device sweep

**Test:** After the four gap-closure fixes land (height-aware layout switch, viewport-relative card cap, Clerk `!important` fallback, sideways toolbar-tip fix), walk `10-SWEEP.md`'s full ten-step table on a real iPhone and a real Android phone — including the steps never reported this round (account menu, the rack's rename/duplicate/delete, all five design screens via the tab bar, saving, and the sideways home-screen return).
**Expected:** Every row PASS, or an honest FAIL/N/A with what broke; the four named questions re-confirmed against the fixed code.
**Why human:** Real-thumb hit size, a genuinely signed-in Clerk avatar, and whether a board drawing "reads" at a given size on a physical screen are exactly what this phase's own sweep exists to catch — no emulator or grep substitutes for it, which is the whole premise of PHON-10.

### Gaps Summary

Four of the six gaps above are precisely the "Follow-up Required" list the shaper already agreed to
in `10-04-SUMMARY.md` (height-aware layout switch + CLAUDE.md correction, viewport-relative card
cap, the Clerk avatar's `!important` fallback, and the sideways toolbar-tip fix) — this verification
confirms that list is the right one and traces each item to the specific truth/artifact it repairs.
Two items are added because they weren't yet written down as follow-ups: **the sweep itself was
never walked to completion** (only the four named questions plus sign-in were reported; the
ten-step table has unfilled rows by its own admission), and **the mid-phase `site-nav.tsx` overflow
fix shipped with no regression test at the width band where the bug actually occurred** (code review
WR-01). Neither is a fabricated bar — the first is the phase's own stated completion condition for
PHON-10 ("no blank cell"), and the second is a real, already-fixed bug the review found had no
standing proof.

None of the four requirement IDs (PHON-07/08/09/10) should be marked complete on this evidence.
REQUIREMENTS.md is correctly left as Pending for all four, and this report recommends the same:
PHON-09 alone has clear, if slightly indirect, real-device proof; the other three are either
partially proven (PHON-07) or explicitly failed on the hardware this phase exists to satisfy
(PHON-08, PHON-10).

---

*Verified: 2026-09-11*
*Verifier: Claude (gsd-verifier)*
