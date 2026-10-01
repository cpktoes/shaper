---
phase: quick-260930-lo8
plan: 01
subsystem: ui
tags: [undo-redo, desktop-shell, playwright, print, tailwind]

requires:
  - phase: quick-260913-k5k
    provides: "PhoneUndoBar — the floating round Undo/Redo pair, originally phone-only"

provides:
  - "The same floating round Undo/Redo pair now shows on a computer too, once there is something to take back"
  - "A computer-only offset (16px from the window's bottom-right corner), chosen by measurement over 69 screen states"
  - "print:hidden on the pair, so it never reaches paper from any screen or device"
  - "A desktop browser test proving the pair's position, enabled/disabled state and nav-walk behaviour"
  - "A phone-measurement browser test proving the phone's pair is unmoved (12px above the tab bar)"

affects: [design-screens, layout, print]

actuals:
  tokens: 6400
  tasks: 2
  commits: 2

tech-stack:
  added: []
  patterns:
    - "Width-keyed Tailwind offset classes (max-shell:/shell:) replacing an inline bottom style, so a later breakpoint can add its own offset without !important"

key-files:
  created: []
  modified:
    - components/design/phone-undo-bar.tsx
    - components/design/phone-undo-bar.test.ts
    - app/design/layout.tsx
    - e2e/undo-redo.spec.ts

key-decisions:
  - "F-1 (founder): one floating pair, mounted once, fixed to the window, same look on every device — never a per-screen toolbar button"
  - "F-2 (founder): the pair appears only once there is something to undo or redo, exactly as it already did on a phone"
  - "O-2 (orchestrator): the computer offset is a plain 16px from the window's corner, chosen over 69 measured screen states (14/69 had any text underneath, versus 23-24 for every other candidate, and none left a button, link, field or tab within 12px)"

requirements-completed: [QT-260930-lo8, 13-SPEC-item-9c]

coverage:
  - id: D1
    description: "On a computer, the round Undo and Redo pair appears at the bottom-right of all six design screens once there is something to take back, and each arrow works"
    requirement: "13-SPEC-item-9c"
    verification:
      - kind: unit
        ref: "components/design/phone-undo-bar.test.ts — PhoneUndoBar source contract"
        status: pass
      - kind: e2e
        ref: "e2e/undo-redo.spec.ts#desktop: the on-screen Undo and Redo pair appears at the bottom-right once there is something to take back, and each arrow works"
        status: pass
    human_judgment: false
  - id: D2
    description: "The pair never prints, from any screen or device"
    requirement: "13-SPEC-item-9c"
    verification:
      - kind: unit
        ref: "components/design/phone-undo-bar.test.ts — print:hidden token case"
        status: pass
      - kind: e2e
        ref: "e2e/undo-redo.spec.ts#the Undo and Redo pair never reaches paper"
        status: pass
    human_judgment: false
  - id: D3
    description: "The phone's pair is unchanged — still 12px above the tab bar, 16px from the right edge, 44px buttons"
    verification:
      - kind: e2e
        ref: "e2e/undo-redo.spec.ts#phone: the pair sits exactly where it always has"
        status: pass
    human_judgment: false
  - id: D4
    description: "How the pair looks in the drawing card's corner on a computer, and the RAILS colour-key overlap it sits over — both need a human's eye"
    verification: []
    human_judgment: true
    rationale: "Visual judgment of placement and an accepted trade-off (the RAILS colour key) belong to the founder, not an automated check"

duration: 99min
completed: 2026-09-30
status: complete
---

# Phase 13 Quick Task 260930-lo8: Undo and Redo Buttons on Every Design Screen on a Computer Summary

**Extended the phone's floating round Undo/Redo pair to the desktop shell: it now shows at the bottom-right of the window on all six design screens once there is something to take back, never prints, and the phone's own pair is proven unmoved.**

## What a shaper sees

**Before this task:** on a computer, the only way to take back an edit was the keyboard shortcut (Cmd/Ctrl+Z). A phone already had a pair of round arrow buttons for this, floating just above its bottom tab bar.

**After this task:** a freshly opened design screen on a computer still shows nothing extra — no buttons, no change to any screenshot. The moment a shaper makes one edit (moves a slider, drags a point, types a number), the same round pair phones already had appears at the bottom-right corner of the window, 16 pixels in from the edge, sitting over the drawing card's own corner. The left (Undo) arrow is active; the right (Redo) arrow is greyed out until Undo is clicked. Walking between TEMPLATE, ROCKER, RAILS, VOLUME, FINS and SUMMARY keeps the pair in that same corner, on every screen, for as long as there's something to take back. It never shows on the home screen, even walking back to it. A phone's own pair has not moved at all — same 12px gap above the tab bar, same 44px buttons.

## Where the pair sits, and why

A plain 16px from the window's bottom and right edges (`shell:bottom-4` plus the existing `right-4`), landing over the drawing card's corner — the same way it already floats over a phone's controls. This number came from measuring four candidate offsets on all six screens, at nine window sizes, scrolled and unscrolled (69 screen states total): 16px left the pair sitting over some piece of text in only 14 of those 69 states, against 23–24 for the other candidates, and in every one of the 69 states no button, link, typed field or tab sat within 12px of it.

One known trade-off, recorded rather than fixed here: on RAILS, while the pair is showing, it sits over the last line of the colour key under the three plots ("Board Thickness"). No bottom-right position clears that — it's left for the founder to decide whether a follow-up is worth it.

## The pair never prints — the one gap it closed

The pair already stayed off the printed order form (SUMMARY) and the RAILS full-size dialog, because those two print stylesheets specifically honour `data-print-hide`. But a print of any *other* screen — TEMPLATE, for instance — would have still carried a floating round button onto the page. Adding Tailwind's own `print:hidden` closes that gap everywhere, on every screen, on every device.

## Commits

1. **Task 1 (tracer): the pair appears on a computer and each arrow works** — `d2cb027`
   - Moved the phone's offset from an inline style into a width-keyed class (`max-shell:bottom-[...]`), unchanged in value, and added the computer's own `shell:bottom-4`
   - Removed the `hidden max-shell:flex` pair that had kept it off desktop width entirely
   - Rewrote the unit test's first few cases to find the wrapper by its `fixed` token and assert on whole tokens, not substrings
   - Added a new desktop browser test proving: no pair on a fresh screen, the pair at the measured corner after one edit, each arrow working, the pair following the shaper through all six screens, and no pair on the home screen
2. **Task 2: the pair never prints, and the phone's pair is proven unmoved** — `666c8fe`
   - Added `print:hidden` to the wrapper, with a unit test case
   - Added a browser test (all three projects) proving print media hides the pair on TEMPLATE and SUMMARY, with the screen state restored right after
   - Added a phone-only browser test (iPhone and Android projects) that measures the pair's position against the tab bar and the viewport edges, matching the numbers already on record

**Plan metadata:** this SUMMARY, committed separately inside the worktree per the plan's `<output>`.

## Test counts

- **Unit (`npx vitest run components/design/phone-undo-bar.test.ts`):** 10 passed
- **Full unit suite (`npm test`):** 91 files, 3593 passed, 2 skipped
- **`npx tsc --noEmit`:** clean
- **`npm run lint -- --max-warnings 0`:** clean
- **Full Playwright browser suite, one foreground run per project** (per plan — the machine was shared with the concurrent executor for quick 260930-lia for part of this run; two unrelated timeouts surfaced during that contention — `e2e/undo-redo.spec.ts`'s pre-existing mouse-drag test and three specs in `e2e/contact.spec.ts`/`error-pages.spec.ts`/`privacy.spec.ts` that turned out to be a stray manually-started dev server missing test-only env flags, not a real regression; both were re-run alone and passed cleanly once the other worktree's suite finished and the server issue was fixed):
  - **desktop:** 149 passed, 106 skipped, 0 failed
  - **iphone:** 172 passed, 83 skipped, 0 failed
  - **android:** 181 passed, 74 skipped, 0 failed
  - **Total:** 502 passed, 263 skipped, 0 failed

No desktop reference screenshot was re-recorded — none needed to be, since the pair renders nothing on a freshly opened screen, exactly as before this task.

## Human verification deferred

Per this plan's `<success_criteria>`, these four are left for the founder, after the merge and before any push:

1. On a computer, make an edit on TEMPLATE, then walk through the six screens — judge how the pair looks in the drawing card's corner, in the theme they use.
2. On RAILS on a computer, with the pair showing, decide whether its sitting over the colour key's last entry ("Board Thickness") is fine, or wants a follow-up that gives the key row room at its right end.
3. On a phone held sideways or a touch-screen laptop (both use the computer layout), check the pair appears in the corner at thumb size once there is something to take back — a sideways phone had no on-screen undo before this task.
4. Give the go to push.

## Found, not fixed

- **The RAILS colour-key overlap (P-4).** At the chosen 16px offset, while the pair is showing, it sits over the last entry of RAILS' colour key ("Board Thickness") under the three plots, on several window sizes. No bottom-right position clears it. A follow-up that gives the key row room at its right end (in `components/rails/rail-band-editor.tsx`) would move the RAILS desktop reference screenshot and is outside this task's files — the founder decides. This is a founder-recorded trade-off, not a defect in this work.
- **Two stale spec comments (P-8).** The helper comments above `undoOnce` in `e2e/rocker-cut.spec.ts` (line 393) and `e2e/rocker-blanks.spec.ts` (line 264) still say the pair is "shown only in the phone layout." The helpers themselves stay correct (the desktop project still uses the keyboard shortcut), but the wording is now out of date. Both files are outside this task's file list — a one-line wording fix for a future pass.

## Deviations from Plan

None — the plan's two tasks, their TDD gates and the measured offsets were followed exactly as written. The only wrinkles were execution-environment noise (a concurrent executor sharing the machine, and a stray manually-started debug server missing two test-only env flags), both diagnosed and resolved without touching any of this plan's files, and both logged above for transparency rather than hidden.

## Self-Check: PASSED

- `components/design/phone-undo-bar.tsx` — FOUND, carries `shell:bottom-4` (×3 incl. doc comment and test) and `print:hidden` (×2)
- `components/design/phone-undo-bar.test.ts` — FOUND, 10 passing cases
- `app/design/layout.tsx` — FOUND, diff against d9d6e2e is comment-only (JSX unchanged)
- `e2e/undo-redo.spec.ts` — FOUND, three new tests added, five pre-existing tests untouched and passing
- Commit `d2cb027` — FOUND in `git log`
- Commit `666c8fe` — FOUND in `git log`
- `e2e/*-snapshots` diff against d9d6e2e — empty (no screenshot re-recorded)
