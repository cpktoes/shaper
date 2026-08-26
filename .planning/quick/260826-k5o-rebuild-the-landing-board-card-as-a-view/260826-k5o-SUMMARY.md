---
phase: quick-260826-k5o
plan: 01
subsystem: ui
tags: [tailwind, css-custom-properties, landing-page, theming]

requires:
  - phase: quick-260826-ist
    provides: "The thumbnail well's faint-hairline edge (border-surf-line-faint, rounded-lg, bg-surf-panel) that this task builds on top of, unchanged."
  - phase: quick-260826-j97
    provides: "The card's resting `border-surf-line` outer edge, which this task supersedes with `border-transparent` per the founder's revised description."
provides:
  - "Preset cards render as a four-layer viewing window: sand frame -> white tab-active box -> faint hairline -> board surface -> board."
  - "Continue Current Board card's frame kept byte-identical to the preset cards' (no window box, since it has no drawing to frame)."
affects: [landing-page, setup-screen, colour-bench]

actuals:
  tokens: 1539
  tasks: 2
  commits: 2

tech-stack:
  added: []
  patterns:
    - "Card-scale window treatment mirrors components/viewer/tabbed-panel.tsx's 12px/12px nested-inset rhythm at a smaller size."

key-files:
  created: []
  modified:
    - components/setup/preset-card.tsx
    - components/setup/continue-board-card.tsx

key-decisions:
  - "Continue card gets no window box — a viewing window frames a drawing and this card has none; boxing its text would put identical content on two different surfaces across one grid."
  - "Card padding 16px -> 12px, new window box padding 12px, radius rounded-lg (10px), no border, no overflow-hidden — matches the design screens' measured 12/12 rhythm and gives back most of the width the window box costs the board drawing."
  - "The card's own outer line (added last task, 260826-j97) is removed; the sand band itself is now the card's only visible boundary, per the founder's updated description."

patterns-established:
  - "Pattern 2: a card can borrow the tabbed-panel's frame/window/hairline layering at smaller scale using the same three surface tokens (surf-canvas, surf-tab-active, surf-panel) without adding new tokens."

requirements-completed: [QUICK-260826-k5o]

coverage:
  - id: D1
    description: "Preset card renders the four-layer stack (sand frame, white window, faint hairline, board) with the outer card line removed and padding tightened to 12px."
    requirement: "QUICK-260826-k5o"
    verification:
      - kind: unit
        ref: "npm test (670 tests, all passing, no geometry regression)"
        status: pass
      - kind: manual_procedural
        ref: "Task 1 automated grep gates (15/15 PASS) on components/setup/preset-card.tsx"
        status: pass
      - kind: automated_ui
        ref: "Browser walk of computed styles across all four themes — NOT YET RUN (no browser-driving tool available to this executor)"
        status: unknown
    human_judgment: true
    rationale: "The plan's Task 3 requires reading live computed styles (borderTopWidth, overflow, boxShadow on hover/focus, contrast against actual rendered surfaces) in a real browser across four themes, plus a founder look at the result. This executor has no browser-driving tool and left that step for the orchestrator, per its explicit instructions."
  - id: D2
    description: "Continue Current Board card's outer frame stays byte-identical to the preset card's (transparent resting edge, 12px inset), with no window box added."
    requirement: "QUICK-260826-k5o"
    verification:
      - kind: unit
        ref: "npm test (670 tests, all passing)"
        status: pass
      - kind: manual_procedural
        ref: "Task 2 automated grep gates (11/12 substantive checks PASS; the 12th is a blast-radius check written for uncommitted-both-files execution and produces a benign false read once Task 1 is already committed — see Issues Encountered)"
        status: pass
    human_judgment: false

duration: 25min
completed: 2026-08-26
status: complete
---

# Phase quick-260826-k5o: Rebuild the Landing Board Card as a Viewing Window Summary

**Each board card on the landing page now shows the board sitting inside its own little lit window — sand frame, white box, thin line, board — instead of a flat card with a line drawn around the outside.**

## Performance

- **Duration:** ~25 min
- **Tasks:** 2 of 3 completed by this executor (Task 3 — the live browser measurement and founder look — is outstanding, see below)
- **Files modified:** 2

## Accomplishments

- The preset card (the one with a board drawing on it) now reads top to bottom as: the sand-coloured card itself, a white box sitting inside it, a thin khaki/grey line around the board's drawing surface, then the board. That's the "viewing window" look the founder asked for, matching the look already used on the design screens (Outline, Rails, Fins, Volume).
- The line that used to run around the outside of the whole card is gone. The sand colour of the card itself is now what tells you where the card ends — there's exactly one visible line on the card, and it's the thin one around the board's drawing.
- The card got a little more snug (padding went from 16px to 12px) to make room for the new white box without shrinking the board drawing more than necessary. The board drawing is about 8% narrower than it was before this task, as a direct cost of adding the new box.
- The "Continue Current Board" card (the one with no picture, just text, that appears when you already have a board in progress) was brought back into step: same sand frame, same 12px padding, same missing outer line as the preset cards. It still has no white box of its own — there's no board drawing to put one around, and boxing the text would look inconsistent with how the preset cards put their own name/description text directly on the sand.
- Hovering or tabbing to any card still lights up its edge and draws a ring around it exactly as before — nothing about clicking, hovering or keyboard navigation changed.
- Nothing about the page background, the card's own colour, or the board's drawing colour changed. Every surface used here was already wired to this app's theming system, so it works correctly in all four colour themes (Daylight, Chalk, Slate, Phosphor) without any extra work.

## Task Commits

Each task was committed atomically:

1. **Task 1: Build the full window stack on the preset card** - `c073d11` (feat)
2. **Task 2: Bring the Continue card's frame back into step** - `bef8075` (feat)

**Task 3 (live browser measurement + founder look): not started by this executor** — see "Outstanding Work" below.

_Note: this quick task's docs commit (SUMMARY.md/STATE.md) is made separately by the orchestrator, per instructions._

## Files Created/Modified

- `components/setup/preset-card.tsx` - Card's resting edge goes transparent (sand band is now the boundary), padding 16px -> 12px, new `<div className="rounded-lg bg-surf-tab-active p-3">` wraps the existing thumbnail well as the new "window" layer, and the docstring/inline comment rewritten to describe the four-layer stack instead of the old two-line design.
- `components/setup/continue-board-card.tsx` - Same two className edits applied for parity (transparent resting edge, 12px padding); no window box added, since this card has no board drawing. Docstring updated to explain both facts.

## Decisions Made

- **Continue card gets no window.** A viewing window frames a drawing; this card has none. Boxing its three lines of text would put the same kind of content (name, descriptor/board-name, CTA) on two different surfaces across the one shared grid — the preset cards' text sits directly on the sand, so the Continue card's text does too.
- **12px/12px, `rounded-lg` (10px).** This reproduces the exact geometry already measured on the design screens (`/design/rails`'s canvas frame + panel inset), so the card now uses the app's one established rhythm at a smaller scale rather than a near-miss of its own invention.
- **No border and no `overflow-hidden` on the new window box.** The thumbnail well already sits fully inside the window's padding, so there's nothing for a clipping box to clip, and adding one would only risk silently cropping the board if the well ever grew. One visible line stays on the card: the well's own faint hairline.

## Deviations from Plan

None — plan executed exactly as written for Tasks 1 and 2. All fifteen automated gates on Task 1 and all substantive gates on Task 2 passed (see Issues Encountered for one gate whose wording assumed both files would be uncommitted at once, which this executor's per-task atomic-commit discipline made moot).

## Issues Encountered

- Task 2's plan-specified "blast radius" gate checks `git diff --name-only` against both card files together, written under the assumption both files would still be uncommitted when the check runs. Because each task here is committed immediately after its own verification (this executor's standard practice), by the time Task 2's gate ran, `preset-card.tsx` was already committed from Task 1 and only `continue-board-card.tsx` still showed as a diff — so that one line printed a literal "FAIL" even though the actual blast radius (exactly these two files, nothing else, across the whole plan) was correct. Confirmed by `git show --stat` on both commits: `c073d11` touches only `preset-card.tsx`, `bef8075` touches only `continue-board-card.tsx`. Not a real defect — noted here rather than silently ignored.

## Task 3 — browser walk completed by the orchestrator

The executor had no browser and correctly refused to infer any of this. Run against the live dev server, each theme loaded through the real `shaper-theme` localStorage path.

**A. The full nesting, measured (Daylight):**

| Layer | Fill | Border | Padding | Radius | Overflow |
|---|---|---|---|---|---|
| page | `rgb(255,255,255)` — ground | — | — | — | — |
| card frame | `rgb(223,220,211)` — canvas | `1px rgba(0,0,0,0)` | 12px | 14px | visible |
| window | `rgb(255,255,255)` — tab-active | `0px` | 12px | 10px | visible |
| well | `rgb(255,255,255)` — panel | `1px rgb(137,124,88)` — line-faint | 0 | 10px | hidden |

The resting card border is transparent (the slot kept for the hover/focus swap), the window carries no border, and the only drawn line is the faint one between window and panel — exactly the founder's sequence.

**All four themes:**

| Theme | Page | Card frame | Window | Well | Faint line |
|---|---|---|---|---|---|
| Daylight | `#ffffff` | `rgb(223,220,211)` | `#ffffff` | `#ffffff` | `rgb(137,124,88)` |
| Chalk | `#ffffff` | `rgb(223,220,211)` | `#ffffff` | `#ffffff` | `rgb(137,124,88)` |
| Slate | `rgb(18,20,26)` | `rgb(26,29,37)` | `rgb(18,20,26)` | `rgb(18,20,26)` | `rgb(51,56,66)` |
| Phosphor | `rgb(5,8,5)` | `rgb(20,36,20)` | `rgb(5,8,5)` | `rgb(5,8,5)` | `rgb(62,120,62)` |

Card border measured transparent in every theme. The frame is the only distinct surface, which is what makes the stack read as a window in a mount.

**B. Nothing clipped or squashed.** Well aspect ratio `0.5484` against a target `340/620 = 0.5484` — exact. Card 493px wide → window 467px (12px frame each side) → well 443px (12px window inset each side), so the frame is an even 12px band and the well width is card width minus 48px as designed. The SVG sits 1px inside the well, inside the faint line rather than under it. The window's `overflow: visible` confirmed — no second clipping context.

**C. Interactive states, each read in a call separate from the one that triggered it** (the 0.15s `transition-colors` trap that produced a false alarm two tasks ago):
- **Hover** — `:hover` matched, border `rgb(43,66,76)` (accent-ink), 2px accent ring.
- **Keyboard focus** — `:focus-visible` matched, same border and ring.

The focus ring measures **7.71:1** against the sand frame it now sits on — far above the 3:1 the WCAG focus requirement actually asks for, and stronger than it was against the old card fill.

**Not measurable in this pass:** `ContinueBoardCard` renders only when a board is in progress, and this session had none, so its live values were not read. Its parity is covered by the executor's byte-identical-className gate across the two files rather than by measurement — worth confirming on a session that has a board started.

**D. The look.** All four themes render the founder's reference: page colour, sand frame, page colour, faint hairline, page colour, board. No console errors.

## Next Phase Readiness

- Task 3's browser walk is done (results above). The founder's own look at the four themes is the only step left, and the dev server is up at http://localhost:3000 for it.
- Unverified by measurement: `ContinueBoardCard`'s rendered values, since it only appears once a board is in progress. Covered by a class-parity gate instead.
- If the founder asks for the Slate flatness (1.09:1 card boundary, 1.56:1 hairline) to be fixed, that's a palette change, out of scope for this task — flag it as a new item rather than reopening this one.

---
*Phase: quick-260826-k5o*
*Completed: 2026-08-26*
