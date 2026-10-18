---
sketch: 017
name: imported-dims
question: "How should the INPUTS block show the dimensions a screen imports, so they are noticeable and read cleanly — one line or one line each, in a card, in the accent colour?"
winner: "C"
tags: [sidebar, inputs, imported, rocker, rails, fins, volume, typography, phone]
---

# Sketch 017: Imported dimensions

## Design Question
The founder (2026-10-18): *"on all pages, can we make the inputs 'imported dimensions' stand out more. Right now they
are actually smaller text. I think I want them more noticable, clearly and cleanly written (should they be on their own
line or concatonated?). Should the dims themselves be in a card? Or written in the accent color, etc?"*

Today each screen's INPUTS block ends with one 12 px muted sentence (`text-xs text-surf-ink-muted`), smaller than the
tick box above it and every label below it:

- ROCKER — `TEMPLATE details are imported: 6'0" × 19"` (`boardLine`, `lib/geometry/blank-reasons.ts`)
- RAILS — `Thickness details are imported: 1 5/16" nose @ 12" · 2 1/2" center · 1 9/16" tail @ 12"` (`railsImportedLine`)
- FINS — `TEMPLATE details are imported: 6'0" · 14 3/4" tail @ 12" · Squash tail · 4" tail block` (`finsImportedLine`)
- VOLUME — `Board details are imported: 6'0" × 19" × 2 1/2", and the rail shapes from RAILS.` (`volumeImportedLine`)

## How to View
open .planning/sketches/017-imported-dims/index.html

The bar switches between each option on all four screens, or **⇆ Side by side** (one screen, every option, with the
height each one takes). **Figures in accent** lights the figures in the accent ink on any option, so it can be combined
with A–D. Daylight / Slate, Imperial / Metric, and Computer / Phone sidebar width. Tick boxes untick to show the block
going away. Figures are the default 6'0" board's real ones, read off the dev server.

## Variants
- **Today** — the 12 px muted run-on sentence, for reference.
- **A: One clear line** — the same one sentence at the sidebar's own 14 px, "From TEMPLATE:" then each figure in ink
  semibold. Smallest change, about 40 px tall.
- **B: Own lines** — a small caption ("FROM TEMPLATE") and one row per figure, name left and figure right, like a spec
  sheet. Easiest to scan; 2–4 rows (about 60–110 px).
- **C: Readout card** — the figures in a card like Pick a Blank's: each figure large with its name in small capitals
  under it, the caption in the accent ink. The most noticeable; about 80–120 px.
- **D: Chips** — "From TEMPLATE" then each figure in its own tinted chip (the board-fill tint), wrapping. Noticeable
  without a box; about 40–70 px.

## What to Look For
- Does the block read as *the board you're working on* at a glance, without competing with the controls under it?
- Phone room: A and D stay close to today's height; B and C add a few lines on every screen.
- Metric: a × series carries its unit once (`182.9 × 48.3 cm`), a figure standing alone carries its own (`182.9 cm`)
  — CLAUDE.md Rule 2's "once per line of running text" rule.
- The wording "From TEMPLATE" / "From ROCKER & FOIL" replaces "… details are imported:" in A–D; open for the founder too.

## Winner

**C — Readout card, figures in ink** (the founder, 2026-10-18: *"Go with C readout card, figures in accent = off"*).
On every screen that imports, the dimensions sit in a small card like Pick a Blank's: a caption in the accent ink
(`FROM TEMPLATE`, `FROM ROCKER & FOIL`), then each figure large in the ink colour with its name in small capitals under
it; VOLUME adds a ruled foot line, "Rail shapes from RAILS". Built in quick 261018-fg1.
