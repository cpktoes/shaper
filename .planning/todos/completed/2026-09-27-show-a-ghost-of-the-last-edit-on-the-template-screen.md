---
created: 2026-09-28T02:10:27.678Z
title: Show a ghost of the last edit on the Template screen
area: ui
severity: minor
files:
  - components/outline/outline-viewer.tsx:357
  - components/outline/outline-viewer.tsx:909
  - components/outline/outline-editor.tsx
  - components/design/design-store.tsx:104
  - lib/design-history.ts:89
  - lib/geometry/outline.ts
  - app/globals.css:745
---

## Problem

Captured from the founder on 2026-09-27, in their words: "add a ghost image on the template page so that when
you edit, you still have a reference of your last edit."

Today, when a shaper drags one of the outline's points or moves a slider on the TEMPLATE screen, the outline
redraws in place and the shape it had a moment ago is gone. Nothing on screen shows what changed. Judging an
edit (is the nose fuller now? did the tail get wider?) means remembering the old shape or flicking undo and redo
back and forth. A faint "ghost" of the previous outline behind the live one would make every edit a
side-by-side comparison.

**Scheduling (founder, 2026-09-27):** Phase 13 optional item **9b**, "before Oct 10, if time allows". It is built
only if the earlier items finish with room to spare before the Wednesday 2026-10-07 freeze; otherwise it waits
until after the Oct 10 showing. Severity minor: a new feature, not a fault.

## Solution

Rough shape, to be settled with the founder when it is planned:

- **The "before" shape already exists.** The design store keeps an undo history (`lib/design-history.ts`,
  imported by `components/design/design-store.tsx`). `recordEdit` folds one whole drag or one slider movement
  into a single step: edits under the same key within `COALESCE_WINDOW_MS` (500 ms) collapse together. So the
  top of the undo stack holds the board as it was before the most recent edit. Drawing that entry's outline
  behind the live one, through the same `sampleOutline` the live outline uses (`outline-viewer.tsx` builds
  `outlinePath` around line 357 and draws it around line 909), needs no new geometry. CLAUDE.md Rule 1 holds:
  the ghost is a second rendering of existing numbers, not new maths.
- **Decisions for the founder:**
  - Which "last edit" the ghost shows:
    - (a) the shape before the most recent edit step, from the undo stack;
    - (b) the shape when the board was opened or last saved;
    - (c) a reference the shaper pins on purpose ("keep this as my reference").
  - Whether it stays until the next edit, fades after a few seconds, or has a show/hide toggle in the viewer toolbar.
  - Whether ROCKER's curve should get the same treatment.
- **Screen only.**
  - Suppress it when printing, the way the `@media print` block in `app/globals.css` already keeps
    `--outline-board-fill` off the full-size template (ink inside a cut template is wasted).
  - Keep it off the Summary sheet and the preset-card thumbnails (the `hideCallouts` consumers).
- **Look and feel.**
  - A thin dashed or low-opacity stroke with no fill, in theme tokens that read in all four themes; check contrast
    yourself, since no AA test exists (see the palette contract in memory).
  - It must work with the board rotated, and must not interfere with the drag targets or touch dragging on a
    phone.
- **Proof.** Unit tests for any pure helper (for example "the outline to ghost, given this history"). Browser
  tests on the three device profiles. The desktop reference screenshots will change on TEMPLATE only once an edit
  has happened; a freshly opened board shows no ghost, so the baselines should hold.

## Outcome

Done as Phase 13 optional item 9b: quick 260930-lia (commits f60fb00, 4e4da62, 7507baf, merged 8daa3b2) and
fast task 138 (35877ea), pushed on the founder's go on 2026-09-30 and live since then.

The founder's choices: the ghost is the outline as it was one edit ago, from the undo history; it stays until
the next edit; a button in the drawing's toolbar hides and shows it, on by default and not remembered; TEMPLATE
only, with ROCKER able to follow later; and a faint solid line at 55% of the muted ink instead of a dashed one.
It never prints and never shows on the home cards, the SUMMARY sheet or any other screen.

Closed on 2026-10-02, when the founder asked for the ghost to hold still until the control is released. This
todo had stayed in the pending list after the ghost went live. The follow-up is its own todo:
`2026-10-02-hold-the-ghost-still-until-the-control-is-released.md`.
