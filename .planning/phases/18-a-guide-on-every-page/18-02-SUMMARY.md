---
phase: 18-a-guide-on-every-page
plan: 02
subsystem: ui
tags: [tab-strip, board-name, container-query, tailwind-v4, playwright, guide-words]

requires:
  - phase: quick 261008-raw
    provides: the board's name in the tab strip's trailing slot
provides:
  - the strip's trailing slot as a size container whose name gives way, gap and all, under 50 dots of room (D-21)
  - the band browser test restated to the room rule, tappability read from the page, a hand-crowded strip either side of the line
  - ROCKER's eleven GUIDE captions on 18-GUIDE-WORDS.md (D-23)
affects: [18-04 ROCKER GUIDE, 18-05 RAILS GUIDE, 18-06, 18-08 all-pages proof, 18-09 the founder's look]

actuals:
  tokens: 10800
  tasks: 3
  commits: 4

tech-stack:
  added: []
  patterns:
    - "A room question answered by a CSS size container on the slot itself (Tailwind v4 `@container` + `@max-[50px]:hidden`), never by a window, pointer or height query"
    - "Browser tests that must hold before and after a later plan read the page (any role=tab) rather than a fixed list"

key-files:
  created: []
  modified:
    - components/viewer/tabbed-panel.tsx
    - components/viewer/tabbed-panel.test.ts
    - e2e/board-name-band.spec.ts
    - .planning/phases/18-a-guide-on-every-page/18-GUIDE-WORDS.md

key-decisions:
  - "The name's line is a 44-dot box (50 dots of room including the 6-dot gap), as the plan set it, not D-21's about 48"
  - "The 6-dot gap before the name moved inside the slot (pl-1.5) so it hides with the name; a strip with no slot keeps gap-1.5 exactly"

patterns-established:
  - "crowdStrip(page, width): narrow a real strip in the browser to test a rule no page triggers yet"
  - "resizeTo(page, size): resize, two frames, then poll the sideways-scroll check, before measuring"

requirements-completed: [R1, R6, R8, R12]

coverage:
  - id: D1
    description: "The board's name is drawn only when the strip has 50 dots of room after its last tab, and not at all with less; tab words never change"
    requirement: R1
    verification:
      - kind: unit
        ref: "components/viewer/tabbed-panel.test.ts"
        status: pass
      - kind: e2e
        ref: "e2e/board-name-band.spec.ts#c1 (iphone, android, desktop)"
        status: pass
    human_judgment: false
  - id: D2
    description: "The band test states D-21 on all five pages at 360-430 upright, sideways, and 1280/1024/820 on a computer; odd names give way at the same room"
    requirement: R12
    verification:
      - kind: e2e
        ref: "e2e/board-name-band.spec.ts (p1, p1b, p2, p3, d1)"
        status: pass
    human_judgment: false
  - id: D3
    description: "The five desktop baseline pictures unchanged"
    verification:
      - kind: automated_ui
        ref: "e2e/desktop-baseline.spec.ts --project=desktop"
        status: pass
    human_judgment: false
  - id: D4
    description: "ROCKER's eleven captions written on the founder's words page"
    requirement: R8
    verification:
      - kind: other
        ref: "awk ROCKER section | grep -c 'caption: `dashed' = 11"
        status: pass
    human_judgment: true
    rationale: "Center Thickness and Nose Tip · Tail Tip captions are Claude's wording (UI-SPEC); the founder may overrule them at the look"

duration: 40min
completed: 2026-11-10
status: complete
---

# Phase 18 Plan 02: The board's name gives way on a crowded tab strip Summary

**The board's name beside the tabs is now drawn only when the strip has 50 dots of room after its last tab (a CSS size container on the name's own slot), and ROCKER's eleven GUIDE captions are written on the founder's words page.**

## Performance

- **Duration:** about 40 min
- **Started:** 2026-11-10T06:15Z (approx.)
- **Completed:** 2026-11-10T06:55Z
- **Tasks:** 3
- **Files modified:** 4

## What changed, in plain English

**Nothing on today's screens.** Every tab strip on every page still has plenty of room, so the board's name shows exactly where it
always has, and the five desktop pictures match to the pixel.

**What the founder will see once ROCKER and RAILS gain their GUIDE tab:** on a narrow upright phone the tabs keep every word he
named, and the board's name simply is not drawn when there is not room for a readable piece of it — never a two-letter stub, never a
strip that pushes the page sideways. With GUIDE added, ROCKER's five phone tabs leave about 1.8 dots at 360, 16.8 at 375 and 31.8 at
390, so the name gives way on all three; it comes back at about 412 dots wide (53.8 dots of room). RAILS' four tabs give way below
about 400 (39.6 dots of room at 390, 61.6 at 412). TEMPLATE, VOLUME and FINS keep the name on every phone. These "after GUIDE"
figures are the plan's arithmetic from measured tab widths; this plan's own run measured today's strips (below).

The decision reads the room left on the strip itself — not the window's width, not whether a finger or a mouse is in use, not the
screen's height, and not how many letters the name has — so "Untitled", a long name, emoji and right-to-left words all give way at
the same room. The small gap before the name now belongs to the name and goes with it, which is what lets ROCKER's five tabs fit a
360-dot phone. Safari older than 16 (no container queries) ignores the rule and shows the strip exactly as it does today; the
founder's iPad runs a Safari older than 18.4, which the plan takes to be 16 or later, so the rule applies there.

## Measured rooms (the band test's log, today's strips)

Room = dots from the last tab's right edge to the strip's right edge. Every one is over 50, so the name is drawn everywhere today.

| Page (phone tabs today) | 360 | 375 | 390 | 412 | 430 |
|---|---|---|---|---|---|
| TEMPLATE (VIEWER · ADD WINGS) | 168.8 | 183.8 | 198.8 | 220.8 | 238.8 |
| ROCKER (VIEWER · TOP · PLANING · DATA, a saved board) | 71.9 | 86.9 | 101.9 | 123.9 | 141.9 |
| RAILS (VIEWER · DATA · INSTRUCTIONS) | 79.7 | 94.7 | 109.7 | 131.7 | 149.7 |
| VOLUME (ESTIMATE, a lone label) | 262.8 | 277.8 | 292.8 | 314.8 | 332.8 |
| FINS (VIEWER · DATA · MODEL INFO) | 100.0 | 115.0 | 130.0 | 152.0 | 170.0 |

Computer: ROCKER 517.8 / 261.8 / 117.8 at 1280 / 1024 / 820; RAILS 519.7 / 263.7 / 119.7; TEMPLATE 628.8 / 372.8 / 228.8;
VOLUME 742.8 / 486.8 / 342.8; FINS 540.0 / 284.0 / 140.0. Sideways phones (844x390, 863x360): the least is ROCKER at 111.8.
Chromium and WebKit gave identical figures. The long name's box when drawn was always room − 6 (gap exactly 6.0).

The rule itself, on a strip narrowed by hand (test c1, all three browsers, and again per page in p3): at 40 and 49 dots of room the
name is not drawn; at 51 it is drawn with a 45-dot box, 6 dots clear of the last tab, shortened with "…"; at 60, a 54-dot box. The
CSS as shipped reads `@container (width < 50px) { .\@max-\[50px\]\:hidden { display: none; } }`.

**Plainly: this plan's own run proves only the side of the line where the name shows on real pages.** No page in this worktree has a
GUIDE tab yet, so no real strip falls under 50 dots; the hidden side is proven here only on a strip narrowed by hand. The hidden side
on real pages is proven when 18-04 (ROCKER) and 18-05 (RAILS) add their GUIDE tab and re-run this band test, and again by 18-08 on
all five pages.

## ROCKER's eleven captions as written (18-GUIDE-WORDS.md)

Each figure is what the app's formatters print for the Shortboard in Imperial (worked out with `npx tsx` through `formatSignedMark`,
`formatMark`, `formatDim`, `formatRockerNote`, `placementRange` and `stationLabel`; the minus is the ASCII hyphen the formatter
prints). All eleven matched the plan's strings exactly; none needed adjusting.

| Card | Caption |
|---|---|
| Center Thickness | `dashed · +1/2" at the center` |
| Nose Tip · Tail Tip | `dashed · +3/8" at each tip` |
| Placement | `dashed · slid 9/16" to the nose` (the Shortboard's blank allows 14.3 mm toward the nose) |
| Deck Skin | `dashed · 1/2" skin` |
| Customize Rocker | `dashed · +1/2"N18"` |
| Nose Rocker | `dashed · +1" nose rocker` |
| Tail Rocker | `dashed · +1" tail rocker` |
| Nose Thinning Starts | `dashed · starts 24" in` |
| Tail Thinning Starts | `dashed · starts 24" in` |
| Nose @ 12" · Tail @ 12" | `dashed · +1/4" at both` |
| Fine tune from | `dashed · -1/4" at the tail 12"` |

Blank, Pin tips to · Deck and Pin tips to · Bottom have no caption.

## Task Commits

1. **Task 1: The board's name gives way when a strip has no room for it** - `1fefe958` (feat)
2. **Task 2: The name-in-the-band browser test states the founder's new rule** - `c1d1ee42` (test)
3. **Task 3: ROCKER's eleven captions on the words page** - `e803432f` (docs)

Task 3 was committed before Task 2 (it was written while Task 2's browser run was going); the two touch different files.

## Files Modified

- `components/viewer/tabbed-panel.tsx` - the trailing slot is `@container flex min-w-0 flex-1 justify-end` around `flex min-w-0 pl-1.5 @max-[50px]:hidden`; the row drops its own gap only when a slot is present
- `components/viewer/tabbed-panel.test.ts` - pins the new slot markup, the gap living inside the slot, and that a strip without a slot still renders `flex flex-none gap-1.5` with no container (the captured "before" fixtures still match)
- `e2e/board-name-band.spec.ts` - the room rule (p1, p1b, p2, p3, d1), `TAPPABLE` replaced by a read of the page, the odd-name case, the hand-crowded strip (c1)
- `.planning/phases/18-a-guide-on-every-page/18-GUIDE-WORDS.md` - eleven ROCKER `caption:` entries, nothing else

## Decisions Made

- Followed the plan's 44-dot box / 50 dots of room line (not D-21's "about 48") for the margins it states.
- The two "MODEL INFO" comments in `tabbed-panel.tsx` were left as they are, for 18-06.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] t1 found the strip by walking two parents up from the name**
- **Found during:** Task 2
- **Issue:** the slot gained one wrapper, so `button.parentElement.parentElement` was now the slot, not the strip, and t1 would have crashed looking for VIEWER in it. `measureBand` had the same walk.
- **Fix:** both now find the strip as the parent of the name's `@container` slot. t1's assertions are unchanged.
- **Commit:** `c1d1ee42`

**2. [Rule 1 - Test design] the odd-name case compares against Untitled on the same board**
- **Found during:** Task 2
- **Issue:** comparing a fresh unsaved ROCKER (three phone tabs: VIEWER · PLANING · DATA) with a saved practice-rack board (four: VIEWER · TOP · PLANING · DATA) compared two different strips, 5.8 dots apart. ROCKER's phone tab set depends on the board.
- **Fix:** p3 opens one saved board, renames it "Untitled", measures every page at every width, renames it to the odd name and measures again; it also narrows each page's strip by hand to 49 and 51 dots of room under both names.
- **Commit:** `c1d1ee42`

**3. [Rule 1 - Flake] a settling resize before measuring**
- **Found during:** Task 2
- **Issue:** once, on the iPhone (WebKit) under load, VOLUME read a page width of 390 at 360 straight after a resize; the same test passed alone.
- **Fix:** `resizeTo` waits two frames and polls the sideways-scroll check for up to 5 s before measuring. A page that truly scrolls sideways still fails, and `expectRoomRule` checks it again.
- **Commit:** `c1d1ee42`

**4. Addition beyond the plan: a hand-crowded strip (c1)**
- The plan gave no crowded strip; the orchestrator allowed one. c1 narrows ROCKER's real strip to 40, 49, 51 and 60 dots of room on all three browsers and confirms the shipped CSS carries the container rule (the plan's Task 1 asked for that confirmation in the browser).

**TDD note:** Task 1 is marked `tdd="true"`; the markup change and its unit test went in one `feat` commit, without a separate failing-test commit first. The old test pinned the old markup, so the new expectations could only pass with the change.

## Test results

- `npx vitest run components/viewer/tabbed-panel.test.ts`: 11 passed.
- `e2e/board-name-band.spec.ts` (all three projects, `IS_WEBPACK_TEST=1 PW_PORT=3112`): 16 passed, 16 skipped by project, 1 failed — e1, unchanged by this plan, timed out at 30 s waiting for a page's first webpack compile. Re-run alone it timed out again opening the practice rack (cold compile); with `--timeout=170000` it passed (52 s). Every new or rewritten test passed in that full run.
- `e2e/desktop-baseline.spec.ts --project=desktop`: 6 passed, no snapshot updated, no baseline changed.
- `e2e/phone-chrome.spec.ts --project=iphone`: 17 passed.
- `npx vitest run` (whole unit suite): 9674 passed, 2 skipped, 1 failed in `lib/geometry/board-surface.test.ts` (a file this plan does not touch, 311 s under the machine load of two executors); re-run alone, all 1210 of its tests passed.
- `npx tsc --noEmit` clean; `npm run lint` 0 errors, 1 warning from before this plan (`lib/db/import-designs-action.test.ts`, `_calls`).

## What later plans must know

- **18-04 / 18-05 / 18-08:** re-run `e2e/board-name-band.spec.ts` once GUIDE is in. p1 logs each page's room per width; on ROCKER and RAILS below about 412 / 400 it should now log `name not drawn`. p1b no longer insists Untitled is whole on ROCKER or RAILS. p2 still insists the name shows on a sideways phone (least room there today 111.8 on ROCKER); if a GUIDE tab takes that under 50, that is a real finding, not a test to loosen.
- `renameFromBand` taps the visible name, so call it on a page and width where the name is drawn (TEMPLATE or FINS at 390 are safe).
- ROCKER's phone tab set differs by board: a fresh unsaved ROCKER shows VIEWER · PLANING · DATA, a saved practice-rack board VIEWER · TOP · PLANING · DATA. The plan's "five ROCKER tabs" arithmetic is the four-tab case plus GUIDE.
- The VOLUME strip is read as tappable from the page, so it reads 31 dots tall once 18-01's GUIDE tab merges, 21 before.
- The 3D page also passes the board's name through the same slot, so the rule reaches it too (it has room).

## Self-Check: PASSED

- FOUND: components/viewer/tabbed-panel.tsx, components/viewer/tabbed-panel.test.ts, e2e/board-name-band.spec.ts, 18-GUIDE-WORDS.md
- FOUND commits: 1fefe958, e803432f, c1d1ee42
