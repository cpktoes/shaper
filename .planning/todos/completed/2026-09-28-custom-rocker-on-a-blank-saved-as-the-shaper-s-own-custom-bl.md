---
created: 2026-09-28T21:00:47.029Z
title: Custom rocker on a blank, saved as the shaper's own Custom Blank
area: rocker
severity: minor
files:
  - components/rocker/rocker-datasheet.tsx
  - components/rocker/blank-picker.tsx
  - lib/geometry/blank.ts
  - lib/geometry/blank-fit.ts
  - lib/blanks/catalog.ts
  - lib/db/schema.ts
---

## Problem

Captured from the founder on 2026-09-28, as a post-Oct-10 todo, in their words: "custom rocker on a blank. What
I'm thinking = Choose "edit rocker" button on the datasheet to unlock the rocker values. Enter new values, then
save blank as a users Custom Blank that now shows in their blank list (it also notifies dev that this rocker
profile is desired). At some point, common rocker adjustments that vendors stock or users are adding should get
added to the apps blank list."

Since Phase 11 a board's rocker comes from the real blank it is cut from. The four rocker numbers on ROCKER's
DATASHEET are read off the vendor's catalogue rows at the board's placement, and they can't be changed except by
picking another blank or moving the board along it. Real blanks are often ordered or glued up with a custom
rocker (vendors stock rocker variants and will press a blank to a shaper's numbers). A shaper who works that way
has no path in the app today.

**Scheduling (founder, 2026-09-28):** after the Oct 10 showing, not part of Phase 13. Rated minor (a new
feature, not a fault) like the backlog's other feature ideas; the founder can re-rate it.

## Solution

To be shaped with the founder when it is planned. Their own sketch, step by step:

1. **"Edit rocker" on the DATASHEET** unlocks the blank's rocker values (the stations the catalogue prints) for
   editing, in the chosen unit system (CLAUDE.md Rule 2; rocker heights are marks: 1/16" or whole mm).
2. **Save as a Custom Blank**: the edited rows become the shaper's own blank, named by them. It is listed in
   their blank list beside the catalogue's, with the same fit checks and reasons, and the shaper can pick it,
   slide the board along it and print from it like any other blank.
3. **The founder is told** that this rocker profile is wanted: which vendor blank it started from and what
   changed. This needs a sending path, and Phase 13 item 10 (the Contact page) has to choose one too, so share it.
4. **Grow the catalogue:** rocker adjustments that vendors stock, or that many shapers add, get promoted into the
   app's shared blank list.

Things to settle then, with pointers:

- **Where a Custom Blank lives.** Since Phase 11 the picked blank's rows already travel inside the saved board
  (`BoardBlank.copy`). A per-account Custom Blank library needs a new table owned by the shaper's Clerk id. It is
  an additive migration, so it goes to production **before** the deploy (CLAUDE.md Database).
- **Which rows may change.** Only the rocker, or thickness too. The fit check (`lib/geometry/blank-fit.ts`)
  and the reason lines (`lib/geometry/blank-reasons.ts`) read the same rows, so a Custom Blank must be
  checked, levelled and PCHIP-sampled exactly like a catalogue blank (`prepareBlank`). A bad value has to fail
  loudly, as the catalogue reader does (`lib/blanks/catalog.ts`).
- **Signed out.** A Custom Blank probably needs an account; say so plainly rather than keeping it per-browser.
- **The curve-flow phase** (todo 2026-09-28, major) changes how rocker curves are drawn between stations. Plan
  this after it, or together with it, so custom rocker values are drawn by the new rules.
- **Paid tier?** A shaper's own blank library could be a Pro feature (build guide M5). The founder decides when
  M5 draws the Free/Pro line.
