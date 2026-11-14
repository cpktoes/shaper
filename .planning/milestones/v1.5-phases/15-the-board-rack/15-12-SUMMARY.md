---
phase: 15-the-board-rack
plan: 12
subsystem: setup / Board Rack (source contracts), house rules, Phase 13 rehearsal walk
tags: [board-rack, source-contracts, units, theme, older-safari, d-04, d-11, d-14, rehearsal-walk]
status: complete
requires:
  - 15-08 (the swipe rack)
  - 15-10 (D-11 ruled: keep hold-and-slide)
  - 15-11 and the code review's fixes (rack-status, use-rack-order, use-fonts-ready, rack-card-menu, lib/models/rack-*)
provides:
  - standing source contracts for the brief's must-nots across every rack file
  - the D-04 sentence in CLAUDE.md
  - 13-UAT.md's walk with the Board Rack (18 steps, Phase 15's four looks) and its printed sheet, issue 3
affects:
  - components/setup/rack-source.test.ts
  - lib/units-isolation.test.ts
  - CLAUDE.md
  - .planning/phases/13-ready-for-the-shapers/13-UAT.md
  - .planning/phases/13-ready-for-the-shapers/13-walk-sheet.pdf
tech-stack:
  added: []
  patterns:
    - "source contract over a file list plus a name scan: rack files in components/setup must be listed (a test fails until a new one is), lib/geometry/rack-*.ts and lib/models/rack-*.ts are found by name"
key-files:
  created: []
  modified:
    - components/setup/rack-source.test.ts
    - lib/units-isolation.test.ts
    - CLAUDE.md
    - .planning/phases/13-ready-for-the-shapers/13-UAT.md
    - .planning/phases/13-ready-for-the-shapers/13-walk-sheet.pdf
decisions:
  - "The source contracts pin what the code is: the duplicate-failed line in rack-caption.tsx is the one warning-ink line, and board-rack.tsx passes the caption null for a board with no model, so the unsaved board can never show it"
  - "The ⋯ menu's Delete row keeps the warning ink and is pinned as the menu's only warning-ink line"
  - "The display-site check in units-isolation now also recognises formatSummaryLine and CardMetadataLine, so the rack's caption and both racks are actually checked rather than skipped"
  - "The walk sheet grew to four Letter pages (the plan allows four): steps 1-6, steps 7-18, both phases' looks, then failures, checks 8 and 9 and the demo-day card"
metrics:
  duration: "8 min"
  started: "2026-10-06T14:23:49Z"
  completed: "2026-10-06T14:31:21Z"
actuals:
  tokens: 11700
  tasks: 3
  commits: 4
---

# Phase 15 Plan 12: The rack's standing checks, the pointer rule and the rehearsal walk Summary

Standing tests now read every Board Rack file and fail if a later change breaks the brief: a colour outside
the theme, warning ink on the unsaved board, a hand-typed inch or foot, CSS 3D or scroll-driven animation that
older Safari can't draw, a stored picture or string-built markup, or a second D-11 switch. CLAUDE.md records
that a mouse or a finger picks which rack draws. And the founder's rehearsal walk, with its printed sheet
(issue 3), now covers the Board Rack.

## What was done

**Task 1: the rack's source contracts** (`cb743fc`)
- `components/setup/rack-source.test.ts` has one file list at the top: the six display files (board-rack,
  hover-rack, swipe-rack, rack-caption, rack-status, rack-card-menu) and four support files (use-rack-boards,
  use-rack-order, use-fonts-ready, rack-config). A new check fails if a file in `components/setup` with "rack"
  in its name is missing from the list. The lib files (`lib/geometry/rack-*.ts`, `lib/models/rack-*.ts`, and
  `lib/rack-stand-in-server.ts`) are found by name.
- New checks (9 describes in all, counting D-04 and the list check):
  - **R4:** every `var(--…)` a display file names is declared in `app/globals.css`, no display file has a hex
    or `rgb(` colour, and both racks draw the stringer with `--outline-station-line` / `--outline-stringer-dash`.
  - **Warning ink (R9):** it appears once in `rack-caption.tsx`, on the `duplicateError` line. `board-rack.tsx`
    gives the caption `null` when the board has no model. The ink never appears in board-rack, hover-rack,
    swipe-rack or rack-status. The ⋯ menu's only warning-ink line is the Delete row.
  - **Rule 2:** both racks import `formatSummaryLine` from `@/lib/geometry/summary-line` and call `useUnits()`.
    The caption prints `<CardMetadataLine>`. No rack file (components or lib) contains `25.4`, `304.8` or `2133.6`.
  - **SPEC constraint 6:** no `perspective`, `rotateX/Y`, `preserve-3d`, `animation-timeline`,
    `scroll-timeline` or `scrollend` in a display file.
  - **SPEC constraint 3:** no inner/outer markup setter, `insertAdjacentHTML`, browser storage or image export
    in any rack file.
  - **D-11:** `const PHONE_MOVE_VIA_MENU` is declared once in `rack-config.ts`, and no other non-test file
    under `components/` or `app/` names it.
- `lib/units-isolation.test.ts`:
  - The purity check now covers `rack-art.ts` and `rack-layout.ts`.
  - The display-site list swaps the deleted `board-rack-card.tsx` for `rack-caption.tsx`, `hover-rack.tsx`
    and `swipe-rack.tsx`.
  - Its "is this a display site" pattern now also matches `formatSummaryLine|CardMetadataLine`. Without
    that, the three rack files would have been skipped silently, since none of them names `DesignSummary`.
- All contracts held on the real code; no rack file needed a change. To prove the contracts can fail, I added
  a temporary line to `rack-status.tsx` with a hex colour, the warning ink, `localStorage`, `25.4`,
  `scrollend` and a second switch. Six checks failed as they should, and the file was restored with
  `git checkout --`.

**Task 2: CLAUDE.md** (`177465b`): the plan's exact sentence goes at the end of the "Control size (and the
Rotate button's presence) — pointer alone." paragraph. The diff is one line, joined onto the paragraph's last line.

**Task 3: the walk and its sheet** (`7ceff8f`)
- `13-UAT.md`:
  - Step 12 now reads "from the Board Rack".
  - New step 13, written for hold-and-slide on phones (D-11 kept, 15-10).
  - The old steps 13 to 17 are now 14 to 18.
  - The "Brought up to date" note is dated 2026-10-06 and keeps the 3 October history with the step numbers
    corrected.
  - New "Phase 15's looks (same sitting)" table with A (long name, sideways phone, E04), B (the Moved note
    vs Open This Board on an iPhone, E09), C (VoiceOver, open item 4) and D (Alt + ← in Chrome, open item 3).
  - Frontmatter `updated:` is bumped.
  - Step 18's "Your boards are all still there" is left as is.
- `13-walk-sheet.pdf` issue 3: four Letter pages (612×792), footer "sheet of 6 Oct 2026, issue 3".
  - A "New in this issue (6 Oct)" box replaces the 3 October fix box and keeps that fix's one line. It says
    plainly that the rack goes live only on the founder's go.
  - Step 13 carries the NEW badge.
  - The HTML lives only in the session scratchpad. `_walk-sheet.tmp.mjs` was written, run and removed in the
    same command each time, and `test ! -e _walk-sheet.tmp.mjs` passes.

## Overflow measurement (walk sheet, before the render)

The first two tries were refused by the script's own check: every page ran over at 10.5pt type, then page 1
still ran 61 dots over at 9pt. Steps 7 and 8 moved to page 2, and the final render measured each page's
last element against its footer's top (CSS px, 1056 per page):

| Page | Content ends | Footer starts | Room |
|---|---|---|---|
| 1 (header, boxes, steps 1-6) | 953 | 1005 | 53 |
| 2 (steps 7-18, laptop extras) | 916 | 1005 | 89 |
| 3 (Phase 14's five looks, Phase 15's four looks) | 835 | 1005 | 170 |
| 4 (failures, check 8, check 9, demo-day card) | 938 | 1005 | 68 |

## Verification

- `npx vitest run components/setup/rack-source.test.ts lib/units-isolation.test.ts`: 114 passed.
- `npx vitest run components/setup lib`: 81 files, 3,654 tests passed.
- `npx next typegen && npx tsc --noEmit`: clean. `npm run lint`: clean.
- Plan greps:
  - `describe(` count 9 (needs at least 7).
  - `rack-art.ts|rack-layout.ts` count 3, and `components/setup/rack-caption.tsx` count 1.
  - The D-04 sentence count 1, and its `^+` diff line count 1.
  - `Board Rack` in 13-UAT.md 5, `Your Boards` 0, `Phase 15's looks` 1, walk steps 18.
  - The pypdf check passes (4 pages, "Board Rack", "issue 3").

## Deviations from Plan

**1. [Rule 1 - Bug] The display-site check would have skipped the rack files it was meant to cover**
- **Found during:** Task 1
- **Issue:** `lib/units-isolation.test.ts` only checks a candidate whose source matches
  `summarizeDesign|DesignSummary|formatDimsExample|presetSummary`. `rack-caption.tsx`, `hover-rack.tsx` and
  `swipe-rack.tsx` match none of these, so adding them as candidates would have done nothing.
- **Fix:** the pattern now also matches `formatSummaryLine|CardMetadataLine`. All three are now checked, and
  each passes the import requirement.
- **Files modified:** lib/units-isolation.test.ts
- **Commit:** cb743fc

**2. [Scope] Contracts extended past the plan's five display files**
- Following the orchestrator's ruling, `rack-card-menu.tsx` is in the display list. Its warning ink is pinned
  to the Delete row. The unsaved board's `null` duplicate error in `board-rack.tsx` is also pinned, so the
  prohibition doesn't rest on a code comment.

**3. [Layout] The walk sheet is four pages, not three**
- Eighteen steps and nine looks don't fit on three Letter pages at a readable size. The plan's check allows
  up to four.

## Findings for the orchestrator (not changed, outside this plan's brief)

- **Walk step 2's Longboard litres may be out of date.** The walk still says "Longboard 9'0" … 75.3 L".
  Memory records that fast task 147 (2026-10-04) opened the Longboard preset in the US Blanks 9'4"B with the
  card reading **73.9 L**. No test pins either figure, and I did not run the app to check. If 73.9 is right,
  step 2 in both 13-UAT.md and the sheet needs one number changed before the founder walks.
- **Walk step 14 ("Menu (gear on the laptop) → Metric")** comes from before App Default Settings
  (quick 261003-uwi). Imperial | Metric now lives in a pop-up behind one menu row. The step still works if the
  founder reads "Metric" as "the Metric choice in App Default Settings", but the wording could be sharper.
- **The Board Rack is not live yet** (branch `board-rack`). The sheet says steps 12 and 13 and the rack's looks
  are walked once it goes live on the founder's go.

## Known Stubs

None.

## Threat Flags

None. The new code is tests that only read source files. The sheet holds only the app's public wording.

## Self-Check: PASSED

- FOUND: components/setup/rack-source.test.ts, lib/units-isolation.test.ts, CLAUDE.md,
  .planning/phases/13-ready-for-the-shapers/13-UAT.md, .planning/phases/13-ready-for-the-shapers/13-walk-sheet.pdf
- FOUND commits: cb743fc, 177465b, 7ceff8f
- No temporary script left: `_walk-sheet.tmp.mjs` absent.
