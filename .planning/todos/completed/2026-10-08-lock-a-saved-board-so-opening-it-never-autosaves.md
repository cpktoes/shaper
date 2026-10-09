---
created: 2026-10-08T21:22:47.083Z
title: Lock a saved board so opening it never autosaves
area: data
severity: minor
files:
  - components/design/design-store.tsx (the autosave effect in DesignProvider)
  - lib/models/autosave.ts:46 (decideAutosave — the save/wait decision)
  - components/design/save-button.tsx (the top bar's Save control and its status)
  - components/setup/board-rack.tsx (where a saved board is opened from)
  - lib/db/schema.ts:65 (the models table — where a lock would be stored)
---

## Problem

The founder, 2026-10-08: "I want to be able to lock a board so it stops auto saving when you go back
in to check it out."

Today a saved board autosaves after every edit, about a second later, once it has been saved for the
first time. So a shaper who opens a finished board just to look at it, or to show it to someone, and
nudges a slider (or drags a point by accident) quietly rewrites that board. Undo can put the shape
back, but the saved copy has already been overwritten by then. A finished design, maybe one that has
already gone to the blank or the glasser, needs a way to stay exactly as it was.

## Solution

TBD. The founder decides the details before planning. Questions to put to them:

- **What a locked board does when it's touched:** let the shaper move things freely but save none of
  it (look and tinker), or freeze the controls so nothing can move until it's unlocked?
- **Where the lock lives:** a lock control next to Save in the top bar, on each board's card in the
  Board Rack, in the ☰ menu, or more than one of these? Does a locked board show a lock badge in the
  rack?
- **Leaving a locked board after changing it:** offer "Save as a new board", throw the changes away,
  or ask the shaper?
- **Whose boards:** saved boards on a signed-in account only? Boards kept only in the browser while
  signed out never write to the database anyway.

Notes for the plan:

- The autosave decision is one pure function (`decideAutosave` in `lib/models/autosave.ts`), so
  "locked means don't save" can be a single extra input there, with unit tests.
- The lock has to be stored with the board so it follows the shaper to another device. That means
  either a new column on `models` (a nullable boolean: an **additive** change, so it migrates
  production BEFORE the code ships, per CLAUDE.md's Database rule) or a field inside the board's saved
  data. A lock is about the saved record, not the design, so a column fits better and keeps the
  board's own data unchanged.
- The Save control's status needs a locked state, so a shaper can always see that nothing is being
  saved.
