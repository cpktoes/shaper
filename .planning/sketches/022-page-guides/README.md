---
sketch: 022
name: page-guides
question: "The founder on 021's GUIDE: \"every page needs a guide like this.\" What is a control's card, against a cut's — one card per control or named choice, the board the shaper has open drawn the page's own way with that one setting pushed, two sentences and a How to shape note — on ROCKER first (round one), then TEMPLATE, RAILS, VOLUME and FINS (round two), and does GUIDE sit as each page's last tab, on a phone too?"
winner: null
builds_on: 021
tags: [guide, template, rocker, rails, volume, fins, cartoons, tabs, sidebar, phone, units, themes, blank, foil, wings]
---

# Sketch 022: A GUIDE on every page

## Design Question
The founder's verdict on sketch 021's GUIDE tab (2026-11-08): *"The Guide looks awesome. Love everything about it. I think
every page needs a guide like this. Super useful on what each parameter does to/for the board. Would also be nice to add a
'how to shape' note too."* The todo `2026-11-08-a-guide-tab-on-every-page.md` says what each page's guide would cover and
asks for a sketch first — one page, to settle the shape of a control's card against a cut's — then the pages together.

**Round one, ROCKER** (2026-11-08). GUIDE joins the page's own tabs — VIEWER · PLANING · DATASHEET on a computer, VIEWER · TOP ·
PLANING · DATA on a phone (the live page's strip since quick 261019-gqo) — as the last tab. Fourteen cards in the sidebar's
own order, each named as the page labels the control: **Inputs** — Center Thickness; Nose Tip · Tail Tip. **Blank** — Blank;
Placement; Deck Skin; Customize Rocker. **Rocker** — Nose Rocker; Tail Rocker. **Foil** — Pin tips to · Deck and · Bottom (one
card per option, like 021's five vees); Nose and Tail Thinning Starts; Nose @ 12" · Tail @ 12"; Fine tune from.

**Round two** (2026-11-08, the same day, on *"Round two: do the other four pages the same way"*): the other four pages as pages
in the same sketch (the bar's Page buttons, in the app's order), each in round one's shape:

- **TEMPLATE** — VIEWER · ADD WINGS · GUIDE. 22 cards under the sidebar's headings: Board Length; Nose Controls (Nose Angle,
  Fullness); Widepoint Controls (Width, Offset, Tail Rail, Nose Rail); Tail Controls (Pin, Round, Diamond, Squash, Swallow each
  drawn on this board; Tail Block; Depth; Tail Angle; Fullness); Wings (the WINGS tab's own sidebar: + Add a wing, Position
  from tail, Depth, Vertical run, Corner radius, Lock to front fin · Offset from the fin — drawn with the first wing the button
  would place, at the front fins' trailing edge). The VIEWER stands the board nose up on a computer as the page does.
- **RAILS** — VIEWER · DATA · INSTRUCTIONS · GUIDE. 17 cards: Inputs (Import Rocker & Foil Values; Board Thickness · Thickness
  @12"); Nose Rail · Center Rail · Tail Rail — every rail has these, drawn at the center (Deck Profile, Family, Ratio,
  Symmetrical) and the tail where only the tail has it (Hard Edge); Advanced (Scaled from center by, Apex Thickness, Deck Mark
  1, Deck Mark 3, Domed Deck Band, Use Single Tuck, Bottom Tuck 1, Bottom Tuck 3, Sharp Bottom Tuck, Tail Rail Blends From ·
  Tail Rail Ends At). The cartoon is the board from above with the three stations and the cross-section at one of them, the
  bands in the page's own colours and the finished rail in ink. On a phone the VIEWER has the NOSE · CENTER · TAIL switch.
- **VOLUME** — ESTIMATE · GUIDE. 8 cards: Inputs (Import Designed Board; Board Length; Board Width; Center Thickness; Board
  Type, with the quick estimate at each of its seven steps) and what the ESTIMATE card reads (Estimated Volume, Template Area,
  Length-Weighted Effective Thickness). The page has no drawing of its own, so the cards draw the plan from above and the
  center cross-section from RAILS; the dashed push says the litres it would give.
- **FINS** — VIEWER · DATA · MODEL INFO · GUIDE. 22 cards: Inputs (Import Designed Board); Fin Setup (Single Fin, Twin,
  Thruster, 2+1, Quad); Thruster Model (Proportional, Basic (Half Rate), McKee Shortboard, McKee Gun); Quad Model (Basic -
  Spread, Basic - Off-Rail, McKee SB/Gun, McKee Longboard, Add 5th/Center fin); Twin Template (Modern/Upright, Keel, Upright +
  Trailer); Advanced (Fin Base Length, Aft/Forward position, Off-Rail, Toe-In — the forward fins'; the rear pair and the
  center fin have the same). Every setup and model is drawn on this board's own tail, the last 24" from above as the VIEWER
  draws it. There is no cant card: the page has no cant.

A card is 021's card: the name, the cartoon, a sentence on what the control is and looks like (ink), one on what it does to
the board or the ride (muted), and under a dashed rule a *How to shape* note. Two things are new because a control is not a
cut: **the board's own value sits beside the name** (`2 1/4"`, `centered`, `60/40`, `Balanced`, `12" · Automatic`), through
the page's own formatters, with *On this board* for a choice's active option; and **the cartoon is the page's own kind of
drawing with the one setting pushed** — the whole board first, then the part the control touches closer, the setting pushed
by a stated amount in muted dashes beside the board as it is, the number dimensioned the way the VIEWER reads it, and a line
under the drawing saying what the dashes show. **The pushes are real:** every dashed profile is the app's own maths with that
one field changed — `designSideProfile` for ROCKER, `buildOutline` for TEMPLATE (the five tails through `TAIL_PRESETS`, the
wing through `nextWing`), `computeRailSectionOutput` + `finishedRail` for RAILS, `computeFinPlacement` for FINS, `computeVolume`
for the quick estimate — never drawn freehand.

Everything else on each page is a picture of today's page from the same numbers so the GUIDE is judged in company: the
sidebar's real labels and values (inert here), the VIEWER, TOP, PLANING, DATASHEET, DATA, INSTRUCTIONS, ESTIMATE and MODEL INFO.

**Every sentence and shop note is a first draft from shaping lore, for the founder's pen.** The `*_GUIDE` and `*_HOW` tables in
the template and `pages.js` are his to correct.

## How to View
open .planning/sketches/022-page-guides/index.html

The bar switches the page (Template · Rocker · Rails · Volume · Fins), the board (the four presets and a fifth, the Shortboard
in a US Blanks 6'8"A, which has 2 3/8" of room to slide where the presets' own blanks have 9/16" to 1 3/8"), the four themes,
Imperial / Metric and Auto / Phone frame. On a computer every GUIDE shows three cards across and scrolls inside the folder; on
a phone one card across inside the pinned drawing area, the page itself never scrolling; a phone held sideways gets the
desktop shell by width, as the app does.

## Variants
None — the question is the shape of a control's card, now on all five pages.

## What to Look For
- **The card's shape.** Whole board, then the part the control touches closer with the pushed setting in dashes and a line
  saying so — does that say what a control does the way 021's shade and section said what a cut is? Are the pushes the right
  size to read (an inch of rocker, half an inch of centre, 20° of nose angle, a 1/2" deck skin, the fins an inch forward)?
- **The value beside the name.** Useful (the guide reads your board) or noise? And *On this board* only for a choice's
  active option.
- **One card or two.** Pin tips to is two cards; Nose Tip · Tail Tip and the two 12" fine-tunes are one card each; the two
  Thinning Starts are two; on RAILS one card stands for all three rails' Deck Profile (and so on); on FINS the Advanced cards
  show the forward fins' only. Which way round should pairs and repeats go?
- **The groups** follow each sidebar's headings. ROCKER's Rocker group has no sidebar section once a blank is picked;
  TEMPLATE's Wings group is the WINGS tab's own sidebar; RAILS' rail group is one for three.
- **Where the sections are drawn** on RAILS: the center for everything, the tail for Hard Edge and Scaled from center by.
- **Tabs on a phone.** Five on ROCKER (the board's name cut to `S…`), four on RAILS and FINS, three on TEMPLATE, two on VOLUME;
  all fit an iPhone 14 on one line. Is GUIDE worth its place on a phone?
- **The sentences and the shop notes** on 83 cards — right, wrong, too long; the founder asked for one or two sentences.
- Small print: the Longboard here sits in the 9'3"Y the Phase 16 fixture recorded it on (the live preset opens in the 9'4"B);
  every board has a blank, so ROCKER's hand-set state is not shown; the fifth board's TEMPLATE, RAILS, VOLUME and FINS are the
  Shortboard's; INSTRUCTIONS and MODEL INFO stand in for the live page's text.

## Checked
Headless Chromium at 1280 × 800 and 390 × 844 (iPhone 14, touch), and the phone turned to 844 × 390: no errors on any page,
theme, units or board. ROCKER as round one left it (fourteen cards, eleven with a pushed profile, the tags, Metric, the phone
stack with five tabs on one line, the board standing nose up, TOP drawing the blank from above, sideways the desktop shell).
The bar's Page buttons are the app's five pages in order and each opens on its first tab. TEMPLATE: VIEWER · ADD WINGS · GUIDE,
the board nose up on a computer and an upright phone, chips in the left gutter and the three read-outs on the right rail; 22
cards under five groups, 16 with a pushed outline (a squash has no Depth to push), Squash tagged on the Shortboard and Swallow
2 3/4" deep on the Fish. RAILS: four tabs, the three plots on a computer and one with the NOSE · CENTER · TAIL switch on a
phone, DATA's three groups, 17 cards under three groups, 16 with a pushed section or marks, the Longboard reading no hard edge,
Symmetrical and 50/50. VOLUME: ESTIMATE · GUIDE, the card's rows and 29.61 L from 51 cross-sections, 8 cards, three with a
pushed plan or section. FINS: four tabs, the tail from above with its dimension lines, 22 cards under six groups, four with
pushed fins, the Shortboard a Thruster on Basic (Half Rate), the Fish a Twin on Modern/Upright, McKee Longboard tagged Needs
8'0". Metric reads 47.6 cm on TEMPLATE's Width, 57 mm on RAILS' thickness, 114 mm on FINS' base. On a phone every page keeps
its tabs on one line, one card across, nothing wider than its card, and the page never scrolls as a whole.

## Source
`sketch-source.tar.gz` holds the two readers — `board-data.ts` (ROCKER: every board's side profile and its thirteen pushed
profiles through `designSideProfile`) and `pages-data.ts` (TEMPLATE, RAILS, VOLUME and FINS: outlines, rail sections, estimates
and fin sets, each with its pushed figures) — their `boards.json` and `pages.json`, the page template and `pages.js` (the four
page modules `build.py` inlines), `build.py` (writes `index.html` and the Artifact's body-fragment copy), the two Playwright
check scripts that also take the pictures, and the wordmark outline. Run the readers with `node_modules/.bin/tsx --tsconfig
tsconfig.json`.
