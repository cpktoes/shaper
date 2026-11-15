---
created: 2026-11-15
title: A community Board Rack of boards other shapers have made public
area: community
severity: minor
files:
  - components/setup/board-rack.tsx
  - components/setup/hover-rack.tsx
  - components/setup/swipe-rack.tsx
  - components/setup/use-rack-boards.ts
  - lib/db/schema.ts
source: the founder, 2026-11-15 — "Rather than uploading board photos, let make a community board rack from either people who choose to make a shape public or all boards created by free users (when we gate that)."
supersedes: 2026-08-19-add-finished-board-photo-uploads-with-ratings.md
resolves_phase:
---

# A community Board Rack of boards other shapers have made public

## The idea

Instead of photo uploads, a second Board Rack — the same sideways boards at one true scale that turn their real turn as
the cursor or thumb passes, as on the home page — holding boards other shapers have designed. A shaper browsing it can
open a board as their own copy to look at or start from. It serves the photo idea's two purposes without photos: it shows
newcomers what the app makes, and it is a stream of real designs to draw social posts from.

## Which boards are on it — two ways, the founder's call

1. **Boards a shaper chooses to make public.** A "Make public" switch on a saved board, off by default, and off again at
   any time.
2. **Every board a free-tier shaper saves**, once Pro is gated (v1.6, guide M5) — public as the price of the free tier,
   with Pro keeping boards private.

Option 2 needs care before it is built. Boards saved today were saved as private, so they could only join the rack with a
shaper's say-so, never by a switch flipped on the server. The rule would have to be stated before sign-up, in the terms and
on the Privacy page, and at the moment of saving. A shaper's name or account must never show beside a board unless they
choose a display name for it.

## What it needs (rough shape, for the planner)

- A visibility column on `models` (nullable, additive — migrate production before the deploy, CLAUDE.md's rule) and the
  switch on the board's own menu.
- A public read path that returns only public boards and only their design fields — never an owner id, email or name.
- The community rack: the home page's rack components reading that list, with a way to open a board as a copy (the board-file
  "open as a copy" path already makes a new id).
- Moderation: a board's name is free text, so a report button and a way for the founder to take one down.
- Ordering: newest, most opened, or the founder's picks.

## Open questions for the founder

- Option 1, option 2 or both; and if 2, whether existing free boards stay private unless their shaper opts in.
- Whether a board on the rack shows a maker's chosen display name, nothing, or a shop name for Pro.
- Whether a copy keeps a link back to the board it came from ("started from …").
- Where the rack lives: its own page, or a second shelf on the home page.

## Replaces

The 2026-08-19 to-do, finished-board photo uploads with ratings, closed 2026-11-15 at the founder's word.
