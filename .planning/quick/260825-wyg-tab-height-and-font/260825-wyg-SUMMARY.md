---
id: 260825-wyg
slug: tab-height-and-font
date: 2026-08-25
type: quick
status: complete
---

# Tab height and font

Shortened the panel tabs on all four design screens (Template, Rails, Volume, Fins) and moved
their labels onto the app's heading treatment, matching the menu bar links and the sidebar
section headings.

## What changed

Single edit in `components/viewer/tabbed-panel.tsx`: the tab `className` const went from
`px-[18px] py-2.5 text-sm font-bold` to
`px-[18px] py-1.5 text-xs font-display font-bold tracking-architectural uppercase`. Added a
sentence to the file's docstring recording the intent, so a later editor doesn't "correct" the
tabs back toward body type. No other lines touched — `border-b-0`, `-mt-px`, and `rounded-t-lg`
(the folder-tab-to-panel join) are untouched, as is the active/inactive colour branch.

Inactive tabs go from 42px to 30px; active tabs from 41px to 29px — 12px returned to the canvas
on every screen that uses `TabbedPanel`.

## Verified

- `npx tsc --noEmit`, `npm run lint` (0 errors, pre-existing warnings only, unrelated files),
  `npm test` (670 passed), `npm run build` — all clean.
- Automated greps confirmed: the new class string lands on a real code line (not just the
  docstring), exactly one `className` const feeds both render branches, and the join tokens
  (`border-b-0` equivalent branch string, `-mt-px`, `rounded-t-lg`) survived unchanged.
- `git status` confirmed only `components/viewer/tabbed-panel.tsx` (plus planning artifacts)
  changed — no consumer files touched.
- Visual/measurement check (Rails then Fins tabs, confirming 30px/29px heights and the
  tab-to-panel join) is pending — that's the orchestrator's human-check step, not run here.

## Worth carrying forward

1. "All four design screens" collapsed to a single file edit because `TabbedPanel` was
   extracted in quick task 260825-pkq for exactly this reason — the extraction paid off here.
2. `font-display` and `font-body` resolve to the identical font stack in `globals.css` today, so
   adding `font-display` to the tab class produced zero visible pixel change. It's included
   anyway because `globals.css` states the rule this codebase runs on — only headings opt out of
   body type with an explicit `font-display` — and the tab is now heading-treatment type, so it
   should carry the token that says so.
