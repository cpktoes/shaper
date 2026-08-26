---
phase: quick-260826-l4n
plan: 01
subsystem: ui
tags: [tailwind, theming, landing-page, css-tokens]

requires:
  - phase: quick-260826-kim
    provides: "the faint line on the well, and the window box carrying border-surf-line-faint that this task flips"
provides:
  - "the landing card's sand-frame/window edge now uses --surf-line, the same structural token components/viewer/tabbed-panel.tsx uses for its panel boundary"
affects: [landing-page, setup-cards, theming]

actuals:
  tokens: 650
  tasks: 1
  commits: 1

tech-stack:
  added: []
  patterns: []

key-files:
  created: []
  modified:
    - components/setup/preset-card.tsx

key-decisions:
  - "One-word token flip: the window box's border-surf-line-faint becomes border-surf-line, per the founder's explicit 'match them' answer — no remaining design judgement call"
  - "The well (inner box around the board drawing) keeps border-surf-line-faint on purpose — the two different line weights, structural outside/soft inside, are the pairing being matched, not something to unify"
  - "File comments rewritten to describe the card that now exists, replacing the prose that argued for the softer line and citing that line's now-obsolete Slate contrast numbers"

requirements-completed: [QUICK-260826-l4n]

coverage:
  - id: D1
    description: "Window-box edge inside the landing card's sand frame now uses the structural --surf-line token instead of the soft --surf-line-faint token, matching the line the design screens draw around their working panel"
    requirement: "QUICK-260826-l4n"
    verification:
      - kind: unit
        ref: "npm test (670 passing, no geometry/rendering test touches this markup directly)"
        status: pass
      - kind: other
        ref: "grep gates in PLAN.md Task 1 <verify>: rename-trap gate (exactly one border-surf-line, one border-surf-line-faint), well/button classes byte-identical, stale prose removed, new figures present"
        status: pass
      - kind: manual_procedural
        ref: "PLAN.md Task 2 browser measurement (Slate/Daylight computed colors, geometry, hover/focus states)"
        status: unknown
    human_judgment: true
    rationale: "Task 2 calls for getComputedStyle readings in a live browser (Slate line color, Daylight no-op check, exact pixel geometry, hover/focus-visible states) — this executor has no browser-driving tool, so those readings were not taken. The token flip itself is confirmed by source-level grep gates and the two themes' known token values, but the founder or a browser-capable agent still needs to look at the actual pixels."

duration: 8min
completed: 2026-08-26
status: complete
---

# Phase quick-260826-l4n: Match landing card's outer line to the design screens Summary

**The line inside the landing card's sand frame — where it meets the white window holding the board picture — now matches the line the design screens (Template, Rails, Fins, Volume) draw around their own working area.**

## Performance

- **Duration:** 8 min
- **Tasks:** 1 of 2 completed in full (code + automated checks); 1 partially completed (automated portion done, browser measurement outstanding)

## What changed on screen

Only one thing changed, and only in one theme:

- **Daylight, Chalk, Phosphor:** nothing looks different. These three colour themes use the exact same colour for the "soft" line and the "structural" line at this spot, so flipping which one is used is invisible.
- **Slate:** the line where the sand frame meets the white window becomes clearly visible. It was previously so close in colour to its surroundings that it barely read as a line at all; now it reads the way the equivalent line reads on every design screen.

The line around the board drawing itself, one layer further in, was deliberately left alone — it's still the soft line. That's not an oversight: having one crisp line around the window and one soft line around the drawing inside it is exactly the look the design screens already use, and matching that pairing (not just matching one colour) was the point of this change.

The card still shows no border at all when it's just sitting there; hovering or tabbing to it still lights up the highlighted edge and ring the way it always has.

## What this was

The founder had earlier asked for a "faint" line at this spot (quick task 260826-kim). After it shipped, they were shown that the design screens use a slightly stronger line in the same position, and offered the choice to match it. Their answer was to match it — this task is that one-word flip, nothing more.

## Deviations from Plan

None — plan executed exactly as written for Task 1.

## Task 2 — browser measurement, completed by the orchestrator

Run against the live dev server, each theme loaded through the real `shaper-theme` localStorage path.

**Slate — the only theme that was supposed to move, and it moved exactly as intended:**

| | Before (`line-faint`) | After (`line`) |
|---|---|---|
| Window box border | `rgb(51,56,66)` | **`rgb(106,112,124)`** |
| Well border | `rgb(51,56,66)` | `rgb(51,56,66)` — unchanged |

The two edges now carry visibly different weights, which is the two-weight pairing `tabbed-panel.tsx` was built around and which previously only existed on the design screens.

**Cross-checked directly against the treatment being matched.** `/design/rails` in Slate measures panel edge `rgb(106,112,124)`, inner card edge `rgb(51,56,66)`. The landing card now measures the same two values in the same two positions — an exact match, not an approximation.

**Daylight — confirmed a genuine no-op**, as predicted from the ramps: window border `rgb(137,124,88)`, well border `rgb(137,124,88)`, frame `rgb(223,220,211)`, well 441px, aspect `0.5484`. Nothing changed by a pixel, because `--surf-line` and `--surf-line-faint` hold the same value there. Chalk and Phosphor share that property and were not expected to move either.

**Geometry untouched.** Well still 441px, SVG 439px, aspect `0.5484` against a target `340/620 = 0.5484` — the token swap carries no layout cost, as expected for a same-width border.

**Interactive states, read in a call separate from the one that triggered them:** hover matched with border `rgb(72,96,92)` (Daylight accent-ink) and a 2px accent ring; keyboard focus landed on the card with `:focus-visible` matching. Both unaffected.

No console errors.

## What was verified (source-level, no browser needed)

- `npm test`: 670/670 passing.
- `npm run lint`: 0 errors (9 pre-existing warnings in unrelated files, untouched by this task).
- The rename-trap check: the well's line (`border-surf-line-faint`) and the button's transparent resting edge both survived byte-identical — only the window box's one class changed.
- `git diff --stat` shows exactly one file changed: `components/setup/preset-card.tsx`.
- The two landing cards' outer button styling is still byte-for-byte identical between `preset-card.tsx` and `continue-board-card.tsx`.
- No other file (`continue-board-card.tsx`, `app/globals.css`, `tabbed-panel.tsx`) was touched.
- The file's comments were rewritten to describe the card as it now exists — the old paragraph arguing for the softer line, and the Slate numbers that were the price of that choice, are gone, replaced with the numbers this change actually achieves and a citation to `tabbed-panel.tsx` as the source of the treatment being matched.

## Self-Check: PASSED

- FOUND: components/setup/preset-card.tsx (modified, single file per `git diff --stat`)
- FOUND: commit 234c0ea — "fix(setup): match landing card window line to design-screen panel edge"
- Grep gates all returned expected values (see verification block above)
