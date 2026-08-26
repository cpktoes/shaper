---
phase: quick-260826-icz
plan: 01
subsystem: ui
tags: [tailwind, css-custom-properties, theming, home-page]

requires: []
provides:
  - "Home page (/) now layers page/card/thumbnail the same way the /design screens layer body/main/panel"
affects: [home-page, theming, design-screens-review]

actuals:
  tokens: 1400
  tasks: 2
  commits: 1

tech-stack:
  added: []
  patterns:
    - "Setup-screen surfaces point directly at the surf-* contract tokens (bg-surf-ground / bg-surf-canvas / bg-surf-panel) at the call site, same as the /design screens, instead of routing through shadcn's bg-card"

key-files:
  created: []
  modified:
    - components/setup/setup-screen.tsx
    - components/setup/preset-card.tsx
    - components/setup/continue-board-card.tsx
    - app/globals.css

key-decisions:
  - "Left --outline-page-bg's value untouched (still var(--surf-canvas)) since it is still consumed by the design-screen SVG viewer background; only its inline comment changed to record that the home page no longer reads it"
  - "Did not extract the duplicated card className into a shared constant, per the plan's explicit no-refactor constraint"

patterns-established: []

requirements-completed: [QUICK-260826-icz]

coverage:
  - id: D1
    description: "Home page's page background repainted from the sand/canvas colour to the app-chrome colour (--surf-ground)"
    requirement: "QUICK-260826-icz"
    verification:
      - kind: unit
        ref: "npm test (670 tests, all geometry/theme-registry suites green)"
        status: pass
    human_judgment: true
    rationale: "A CSS token repoint has no automated visual assertion in this repo (no palette/contrast test file exists by prior founder decision) — a human needs to look at the four themes to confirm the page reads as one chrome colour with the nav."
  - id: D2
    description: "Both board cards (preset cards and Continue Current Board) repainted from the plain white shadcn card to the sand drawing surface (--surf-canvas), staying byte-identical to each other"
    requirement: "QUICK-260826-icz"
    verification:
      - kind: unit
        ref: "Task 1 verify gate 5 (diff of card className strings) — asserted PASS during execution"
        status: pass
    human_judgment: true
    rationale: "Visual weight parity between the two card types is a judgment call best confirmed by eye, per the plan's blocking checkpoint."
  - id: D3
    description: "Thumbnail well inside each preset card repainted to the panel surface (--surf-panel), matching the /design screens' inner content card"
    requirement: "QUICK-260826-icz"
    verification:
      - kind: unit
        ref: "Task 1 verify gate 3 (bg-outline-page-bg has zero remaining .tsx consumers) — asserted PASS during execution"
        status: pass
    human_judgment: true
    rationale: "Whether the well reads as a distinct surface (or collapses visually into the page) is exactly the open question this task's own measurement flags — needs a human look."
  - id: D4
    description: "Four-theme contrast/layering measurement of the new surface stack and every foreground/boundary on it"
    verification:
      - kind: other
        ref: "scratchpad contrast.mjs run against app/globals.css LAYER 1 ramp values (see Task 2 table below)"
        status: pass
    human_judgment: false

duration: 20min
completed: 2026-08-26
status: complete
---

# Phase quick-260826-icz Plan 01: Home Page Surface Repaint Summary

**Home page's page/card/thumbnail-well now use the app's ground/canvas/panel tokens directly, matching how every /design screen already layers its background, drawing area, and inner card — three class-name swaps, one rewritten code comment, zero token values changed.**

## Performance

- **Duration:** ~20 min
- **Completed:** 2026-08-26T20:24:37Z
- **Tasks:** 2 of 3 (Task 3 is a blocking human-verify checkpoint, handed back — see below)
- **Files modified:** 4

## Accomplishments

- The home page's scrolling background is now `bg-surf-ground` (the app-chrome colour — same as the nav and the body behind everything), instead of the sand-coloured drawing surface it used before.
- Both the preset cards and the "Continue Current Board" card now sit on `bg-surf-canvas` (the sand drawing surface), instead of the plain white/near-black shadcn card colour — and the two card types remain byte-identical to each other.
- The little board picture inside each preset card now sits in a `bg-surf-panel` well (the same surface the design screens use for their inner content card), instead of the same colour as the design-screen drawing background.
- `app/globals.css`'s `--outline-page-bg` comment was rewritten to record that its one remaining job is painting the SVG background behind the board on the four `/design` screens — it no longer has anything to do with the home page.
- Measured all three new surfaces plus every foreground/boundary that sits on them, across all four themes (Daylight, Chalk, Slate, Phosphor) — see the table below.

## Task Commits

Each task was committed atomically:

1. **Task 1: Move the three home-page surfaces onto ground / canvas / panel** - `abad7b7` (fix)
2. **Task 2: Measure the new surface stack and every foreground on it, in all four themes** - no repo files to commit (scratchpad script + this SUMMARY only, per the plan's own instruction)

**Plan metadata:** (docs commit handled by the orchestrator after this SUMMARY, per this run's instructions)

## Files Created/Modified

- `components/setup/setup-screen.tsx` - scrolling root div: sand token → `bg-surf-ground`
- `components/setup/preset-card.tsx` - card button: `bg-card` → `bg-surf-canvas`; thumbnail well: `bg-outline-page-bg` → `bg-surf-panel`
- `components/setup/continue-board-card.tsx` - card button: `bg-card` → `bg-surf-canvas` (kept character-for-character identical to preset-card.tsx's class string)
- `app/globals.css` - comment above `--outline-page-bg` rewritten to name its sole remaining consumer (`components/viewer/callout-primitives.tsx`'s SVG fill) and disclaim the home page; the declaration's value (`var(--surf-canvas)`) and the Tailwind bridge line are untouched

## Decisions Made

- Kept `--outline-page-bg`'s value exactly as it was and changed only its comment, per the plan's explicit instruction not to repoint that token (doing so would repaint every /design-screen viewer).
- Left the duplicated card `className` string in both card files exactly as duplicated — no shared-constant refactor, per the plan's one-change-at-a-time constraint.

## Deviations from Plan

**1. [Rule 3 - Blocking] Reworded the new globals.css comment to satisfy the file's own comment-only verification gate**

- **Found during:** Task 1 verify (gate 6, "globals.css is comment-only")
- **Issue:** The plan's gate 6 filters diff lines by leading `/*`, `*`, or `//`. My first draft of the new comment used the file's other, non-JSDoc multi-line style (only the opening line starts with `/*`, continuation lines are plain indented prose) — matching the style of the adjacent `--outline-sidebar-input-border`/`--outline-sidebar-divider` comment a few lines above it. That style makes the diff a true no-op comment change, but the gate's regex only recognizes lines individually prefixed with `*`, `/*`, or `//`, so it flagged the continuation lines as "content."
- **Fix:** Rewrote the same comment text in the file's other existing convention (each continuation line prefixed with `*`, matching the `.slider-accent` comment block later in the same file) so the gate's per-line filter recognizes every line as a comment. No wording was cut — only the line-prefix style changed.
- **Files modified:** `app/globals.css`
- **Verification:** Re-ran gate 6; printed PASS. `git diff -U0 app/globals.css` confirms every changed line still begins with `/*` or `*`.
- **Committed in:** `abad7b7` (Task 1 commit)

---

**Total deviations:** 1 auto-fixed (blocking — verification-gate formatting only, no content or token-value change)
**Impact on plan:** Cosmetic-only fix to satisfy the plan's own automated check. No scope creep, no behavior change.

## Issues Encountered

None beyond the deviation above.

## Task 2: Four-Theme Measurement

Method: read the four `--ramp-<theme>-*` blocks directly out of `app/globals.css` LAYER 1 (not retyped), computed with a throwaway WCAG-contrast script in the scratchpad (not committed, not added to the repo). All planning-time reference numbers were reproduced exactly.

### a. The surface stack itself (page / card / thumbnail well)

| Theme | Page vs. Card (ground/canvas) | Card vs. Well (canvas/panel) | Page vs. Well (ground/panel) |
|---|---|---|---|
| Daylight | 1.37 | 1.37 | **1.00 (identical colour)** |
| Chalk | 1.37 | 1.37 | **1.00 (identical colour)** |
| Slate | 1.09 | 1.09 | **1.00 (identical colour)** |
| Phosphor | 1.24 | 1.24 | **1.00 (identical colour)** |

**Plain English:** in every theme, the page behind the cards and the little well inside each card end up exactly the same colour. The stack reads as two alternating tones — page, then card, then back to the page's own colour — not three separate steps. Slate is the softest: its page and card are the closest of any theme (a 1.09 ratio is a very subtle lift). This matches exactly what the /design screens already do, and the plan flagged this as the expected, not-a-bug outcome; getting three genuinely distinct tones would need a founder-approved palette change, which is out of scope here.

### b. Text on the new outer card surface (canvas) — bar 4.5:1

| Theme | Title (ink) | Descriptor (ink-muted) | Call-to-action (accent-ink) |
|---|---|---|---|
| Daylight | 10.54 pass | 4.58 pass (tight, +0.08 over bar) | 4.94 pass |
| Chalk | 10.54 pass | 4.58 pass (tight, +0.08 over bar) | 7.71 pass |
| Slate | 15.29 pass | 7.04 pass | 4.70 pass (tight, +0.20 over bar) |
| Phosphor | 7.84 pass | 5.11 pass | 5.65 pass |

**Plain English:** every piece of text on the cards is legible on the new sand-coloured card fill in all four themes. Two combinations are close to the line — Daylight/Chalk's descriptor text and Slate's "Start Shaping" call-to-action — close enough to flag, but still on the right side of it.

### c. The card's edge — bar 3:1 (boundary/graphical)

| Theme | Resting ring vs. page | Resting ring vs. card | Hover ring vs. page | Hover ring vs. card |
|---|---|---|---|---|
| Daylight | 1.20 fail | 1.20 fail | 6.77 pass | 4.94 pass |
| Chalk | 1.20 fail | 1.20 fail | 10.57 pass | 7.71 pass |
| Slate | 1.28 fail | 1.33 fail | 5.14 pass | 4.70 pass |
| Phosphor | 1.13 fail | 1.20 fail | 7.00 pass | 5.65 pass |

**Plain English:** the resting (un-hovered) card edge is faint in every theme — well under the 3:1 boundary bar. **This is pre-existing, not a regression from this task.** Before this change, the page was the sand colour and the card was the white/panel colour, but panel and page/ground turn out to be the same colour in all four themes too (see the ground/panel row above), so the old resting-edge numbers were in the same 1.1-1.3 range against the old page. Swapping which two tokens sit on either side of that faint edge didn't meaningfully change how faint it is. The hover/focus accent outline, by contrast, is comfortably clear of the 3:1 bar in every theme, both before and after — that's the boundary a shaper actually relies on to see they've selected a card.

### d. Inside the thumbnail — board wash (no bar; decorative fill)

| Theme | Wash vs. old well (canvas) | Wash vs. new well (panel) |
|---|---|---|
| Daylight | 1.17 | 1.17 (unchanged) |
| Chalk | 1.12 | 1.23 (improved) |
| Slate | 1.11 | 1.21 (improved) |
| Phosphor | **1.00 (invisible — was a bare stroke)** | 1.24 (now has a visible fill) |

**Plain English:** the board's interior wash barely showed up against the old well background in three themes, and was completely invisible in Phosphor (the planshape read as a bare outline with no fill at all). Moving the well onto the panel colour fixes that — Phosphor's board now has a faint but visible interior tint, and the other three themes hold steady or improve slightly. No theme gets worse.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

Code and measurement work is done and committed (`abad7b7`); `npm test` (670 tests) and `npm run lint` (0 errors) are both green.

**Task 3, the four-theme browser checkpoint, was completed by the orchestrator after the executor handed it back.** Dev server on `localhost:3000`, each theme loaded through the real `shaper-theme` localStorage path (so the pre-hydration script ran), and the painted backgrounds read out of the live DOM rather than judged by eye:

| Theme | Nav (ground) | Page | Card | Thumbnail well |
|---|---|---|---|---|
| Daylight | `#ffffff` | `#ffffff` | `#dfdcd3` | `#ffffff` |
| Chalk | `#ffffff` | `#ffffff` | `#dfdcd3` | `#ffffff` |
| Slate | `#12141a` | `#12141a` | `#1a1d25` | `#12141a` |
| Phosphor | `#050805` | `#050805` | `#142414` | `#050805` |

The page now matches the nav exactly in all four themes — that is the "window" the founder asked for — the card is canvas, and the well is panel. Confirmed alongside that:

- **Keyboard focus ring holds up.** Tabbing to the Shortboard card in Slate paints a 2px `rgb(52,144,188)` ring, which measures **4.70:1** against the card fill — comfortably over the 3:1 boundary bar. The accent outline is still the boundary a shaper actually relies on.
- **Resting card edge in Slate measures 1.09:1**, matching the executor's prediction exactly. Faint, and pre-existing rather than introduced here.
- **Phosphor's board wash is genuinely visible now.** On the green theme the planshapes previously read as bare outlines with no fill; they carry a tint against the near-black well.
- **The design screens did not move.** `--outline-page-bg` still resolves to canvas (`#142414` in Phosphor), `/design/outline` renders unchanged in both Phosphor and Daylight, and the console reported no errors.

One item is a founder decision rather than a defect: **ground and panel are byte-identical in all four ramps**, so the requested three-tier stack lands as two alternating tones. Giving panel its own ramp value would be a separate task.

---
*Phase: quick-260826-icz*
*Completed: 2026-08-26*

## Self-Check: PASSED

All four modified files found on disk; commit `abad7b7` found in git log.
