# Phone Chrome & Navigation

## Design Decisions

The founder's rule for phones: **"phone real estate is expensive, we need to save all of it."**

1. **No bottom tab bar** (007 C1, live 2026-10-03). On an upright phone, and on any short screen that uses
   the compact top bar, ☰ opens a sheet of **six screen tiles drawn from the current board**, the current
   one ticked, above Home, Contact, Privacy, Units, Theme and the account. On a desktop-shell width the
   tiles form one row of six, otherwise three by two (width alone).
2. **Each tile is that screen's own drawing of the board**, labels left out: Template's outline lying down,
   Rocker's side profile in its blank, the centre rail's band diagram, the Volume screen's **real** litres
   (never a made-up number), the Fins tail and fins, and a small order form. They come straight from the
   design store (`lib/geometry/screen-tiles.ts`), and nothing is captured or stored. True proportions
   always: "rocker cannot look like a U".
3. **Every design screen ends with Back + Next** (008 B): "← previous" and "next →" side by side under the
   last control, in the order Template, Rocker, Rails, Volume, Fins, Summary. The first screen has only
   Next and the last only Back. ☰ is for jumping around; Back + Next is the usual walk ("almost wizard
   like").
4. The 56 dots freed by the tab bar go to the controls (122 → 178 on an iPhone 14's 390 × 664 page). The
   Undo/Redo pair sits in the bottom-right corner.

The three screen switches stay separate (CLAUDE.md Layout): width picks the layout, the pointer picks
control size, and height picks short-screen behaviour.

## CSS / HTML Patterns

- Tiles are real menu items (arrow keys, Enter, tap). Each one's accessible name is its screen plus one line
  ("VOLUME — 29.6 L Estimated"), with the picture hidden from screen readers. The current tile carries
  `aria-current="page"`. Moving between screens uses `router.push`, so an unsaved board and its undo history
  survive.
- Pictures are SVG drawn in the board's own millimetres and fitted with `preserveAspectRatio="xMidYMid meet"`,
  which keeps proportions true.

## What to Avoid

- Rough or stock tile icons (007 C round 1); fixed drawings with no numbers (007 C2).
- The screen name in the top bar as a dropdown (007 B), and a plain list of six screens (007 A).
- A single Next button with no way back (008 A).

## Origin
Synthesized from sketches: 007, 008 (2026-10-03)
Source files available in: sources/007-phone-screens-in-menu/, sources/008-next-screen-button/
