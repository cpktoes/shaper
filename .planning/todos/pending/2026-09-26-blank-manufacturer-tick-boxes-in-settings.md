---
created: 2026-09-26T20:17:23Z
title: Blank manufacturer tick-boxes in settings
area: rocker
severity: minor
files: [components/settings-menu.tsx, components/rocker/blank-picker.tsx, components/rocker/use-blank-list.ts, lib/fit-defaults-preference.ts, app/actions/fit-defaults.ts]
---

## Problem

Captured during Phase 11 UAT (2026-09-26, test 5). The founder, in his own words: "I think I'd like
to add in settings: blank manufacturer selector. A tick box for which mfg shows up in the blanks box.
Default is all, but many users will have a preference or limitation."

Today the ROCKER blank list always shows all three catalogues (US Blanks, Arctic Foam, Marko Foam).
A shaper who only buys from one supplier, or whose local supplier only carries one, scrolls past two
thirds of the list every time.

## Solution

Rough shape, to be planned as a quick task or a small phase:

- A per-shaper preference, like Units and Fit & Tip Defaults: three tick boxes (one per manufacturer)
  in the gear menu / settings. Default: all ticked. Signed in, it follows the account; signed out,
  the browser remembers it (same handoff pattern as the fit defaults — cookie + account columns).
- The blank list (`use-blank-list.ts`) leaves unticked manufacturers out entirely, not greyed, and
  says so in one line when a filter is active ("Showing US Blanks only — change in Settings").
- The saved board keeps whatever blank it already has, even from an unticked manufacturer; the
  filter shapes the list, never the board.
- Presets keep their provisional picks regardless of the filter.
