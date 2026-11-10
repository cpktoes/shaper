---
phase: 18-a-guide-on-every-page
plan: 09
subsystem: guide
status: complete
tags: [guide, pictures, founder-look, claude-md, d-21, d-22, d-25]
requires:
  - "18-08: all five GUIDEs merged and proven together"
provides:
  - ".planning/phases/18-a-guide-on-every-page/pictures/ — 50 PNGs of every page's GUIDE"
  - ".planning/phases/18-a-guide-on-every-page/pictures/README.md — the plain-English index"
  - "CLAUDE.md — one Layout paragraph recording the GUIDE and the strip's board-name rule"
affects: [18-10, the founder's look]
tech-stack:
  added: []
  patterns:
    - "Scratch Playwright script outside the repo against a webpack dev server; the dev badge hidden by an injected style"
    - "A group taller than the window, inside the GUIDE's own scroller, is pictured in a tall window with a clip, not an element screenshot"
key-files:
  created:
    - .planning/phases/18-a-guide-on-every-page/pictures/README.md
    - .planning/phases/18-a-guide-on-every-page/pictures/*.png (50)
  modified:
    - CLAUDE.md
decisions:
  - "Close-ups picked per page: TEMPLATE Width (the Shortboard's Depth reads 'Diamond & swallow only', so the Fish's Depth has its own picture), ROCKER Nose Rocker, RAILS Hard Edge, VOLUME Board Length, FINS Thruster"
  - "Added beyond the plan's list: part-way-down pictures (computer and phone), Metric close-ups for TEMPLATE, ROCKER and VOLUME, and 820-dot strip pictures for ROCKER and RAILS, so every ruling has a picture"
  - "The CLAUDE.md paragraph sits after the paragraph that closes the width switch (which carries ROCKER's tab words), so the next paragraph's 'this switch' still points at the width switch"
metrics:
  duration: "about 1 h 20 min"
  completed: 2026-11-10
  tasks: 2
  commits: 3
  files: 52
actuals:
  tokens: 4500
  tasks: 2
  commits: 3
---

# Phase 18 Plan 09: Pictures of every GUIDE for the founder's look — Summary

**Fifty pictures of the GUIDE tab on all five design pages — computer in Imperial and Metric, upright iPhone, held
sideways, the ROCKER and RAILS strips at 360 / 390 / 430 / 820, a close-up card per page in both systems, the Fish's
Depth, FINS' Twin group and a Slate card — with a plain-English index, plus one paragraph in CLAUDE.md.**

## How the pictures were taken

A scratch Playwright script (in the session's temp folder, never committed) against a webpack dev server on port
3119 carrying the browser suite's own environment values. Each window opened the Shortboard from the home page (not
saved, so the name reads "Untitled"), then went to each page and pressed GUIDE. Computer: Chromium 1280 × 800 (close-ups
at 2×). Phone: WebKit iPhone 14 upright, and 844 × 390 on its side. Strips: Chromium with a touch screen at 360, 390 and
430 wide, and a plain 820-wide computer window. Metric by the chooser's saved pick; Slate by the theme's saved pick
(`shaper-theme` = `slate`). The dev server's corner badge was hidden with an injected style. Every picture was looked
at; every one shows GUIDE selected, the Shortboard (6'2" / 188.0 cm), no banner, and drawings painted.

Two retakes: the first `fins-twin-group.png` came out as a wrong slice of the page (a group taller than the window,
inside the GUIDE's own scroller, cannot be captured by an element screenshot) and was retaken in a 2600-tall window;
a stray throwaway picture from the script was deleted, never committed.

## The pictures (50)

Each page × {computer, computer part-way down, computer Metric, phone, phone part-way down, sideways}: 30.
ROCKER and RAILS strips at 360, 390, 430 and 820: 8. Close-ups `template-card`, `rocker-card`, `rails-card`,
`volume-card`, `fins-card` and Metric close-ups `template-card-metric`, `rocker-card-metric`, `volume-card-metric`,
`fins-card-metric`: 9. `template-depth-fish`, `fins-twin-group`, `card-slate`: 3. All named once in `pictures/README.md`.

## The strips agree with the measurements (D-21)

Room after the last tab, measured in the picture run: ROCKER 1.8 / 31.8 / 71.8 and RAILS 9.6 / 39.6 / 79.6 at 360 /
390 / 430 — exactly 18-08's figures. The board's name is drawn only at 430 on both, and not in an 820-dot window on
either. Held sideways, ROCKER (full words TOP VIEW and DATASHEET at that width) has no name and RAILS has it.
TEMPLATE, VOLUME and FINS show "Untitled" on the upright phone. No strip pushes the page sideways (page width equals
window width in every picture).

## D-22 and D-25 as pictured

No inch or foot figure on any Metric card pictured (the blank's own name `6'3"RP` aside). Metric pushes seen: length
+15 cm (188.0 → 203.0 cm), width +2.5 cm (47.6 → 50.1 cm), centre thickness +13 mm, tips +10 mm, nose rocker +25 mm,
rail thickness +6 mm (57 → 63 mm), fins 25 mm forward. All round figures.

## The paragraph added to CLAUDE.md

In the Layout section, after the paragraph that closes the width switch (the one carrying ROCKER's tab words): GUIDE
is the last tab on TEMPLATE, ROCKER, RAILS, VOLUME and FINS (Phase 18); what a card is; VOLUME's strip became two
tappable tabs and FINS' MODEL INFO tab is gone, its words on the cards; a GUIDE reads and never writes; its words live on
`18-GUIDE-WORDS.md` (moved to the archive when the phase closes) and a test holds the code to them; a strip's board
name is drawn only with 50 dots of room after the last tab (a 44-dot box), otherwise not at all, decided by the strip's
own trailing slot and none of the three screen switches; ROCKER loses it below about 412 upright and RAILS below about
400, both at an 820-dot window; this changes the founder's rule of 2026-10-08 on ROCKER and RAILS and is his to
overrule, shorter phone tab words being the other lever. `git diff --stat CLAUDE.md`: 15 insertions, no deletions.

## What the pictures showed that may look wrong (not fixed — no code changes in this plan)

1. **ROCKER, Nose Rocker card, computer 1280, both systems and Slate** (`rocker-card.png`, `rocker-card-metric.png`,
   `card-slate.png`): the nose-rocker figure (`4 1/4"` / `107 mm`) sits on top of the nose's drawn lines — the board's
   outline and its dashed push run straight through the figure's right half, so "1/4"" and "mm" are crossed by lines.
   The same thing happens on the **Customize Rocker** card (`rocker-guide-computer-scrolled.png`): its `+7/16"` label
   at the nose tip is crossed by the lines. The 18-08 overlap test checks labels against labels and window edges, not
   against the drawing's own lines, so it does not catch this.
2. **Dimension end-ticks crossing figures** — smaller, same kind: TEMPLATE's Depth on the Fish (`template-depth-fish.png`,
   the tick runs through "3/4"), FINS' Twin and Keel cards (`fins-twin-group.png`, ticks through "7 1/2"" and "6 1/4"").
   Readable, but not clean.
3. **FINS, Import Designed Board card, computer 1280, Metric** (`fins-guide-computer-metric.png`): "30 mm off rail"
   and "279 mm off tail" sit end to end on one line with a few dots between them; in Imperial the two labels sit on
   separate lines. Not overlapping, but cramped.

None of these is a wrong number; all are drawing-label placement for the founder's look or a later fix.

## Deviations from Plan

1. **More pictures than the plan listed** (50, not 35): part-way-down pictures on the computer and the phone (the
   phone's pinned GUIDE shows only the introduction and the top of the first card), Metric close-ups for three more
   pages, and ROCKER/RAILS at an 820-dot window — so every ruling the README names has its own picture.
2. **TEMPLATE's close-up is Width, not Depth**: on the Shortboard Depth reads "Diamond & swallow only"; the Fish's
   Depth picture covers it.
3. **The dev server ran with webpack** (`next dev --webpack`) per the orchestrator, not plain `next dev` as the plan said.
4. **The dev server sometimes left a page un-hydrated on first load** (the strip would not answer a tap); the script
   reloaded the page after about a minute of tries and carried on. No picture was taken of an un-hydrated page.

## Task Commits

1. **Task 1: pictures and index** — `ef3d9e87`
2. **Task 2: CLAUDE.md paragraph** — `e466e1b8`

## Known Stubs

None.

## Threat Flags

None. T-18-07: every picture is a preset opened signed out; no account, saved board or environment value is shown.

## Self-Check: PASSED

- FOUND: pictures/README.md and 50 PNGs, each named once in the README
- FOUND commits: ef3d9e87, e466e1b8
- CLAUDE.md: 15 lines added, none removed
