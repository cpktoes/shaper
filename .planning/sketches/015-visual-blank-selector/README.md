---
sketch: 015
name: visual-blank-selector
question: "Where should a picker that shows each blank — outline from above, rocker from the side, printed dims — live on ROCKER: a BLANKS tab, a popup window, or today's list with a drawing on every row? And should the blanks lie flat or stand upright on a phone?"
winner: "B"
tags: [rocker, blank, picker, catalogue, favourites, tabs, popup, phone, filters]
---

# Sketch 015: Picking a blank by sight

## Design Question
The founder (2026-10-15) wants to pick a foam blank by **seeing** it — its outline from above and its rocker from the
side, at true proportion, with its name and printed dims — instead of from today's text list, and to **star** blanks so
starred ones always come first. Undecided: *"whether that's a tab like wings, or a popup window."*

While the sketch was being built the founder added a third option and a direction:
*"a third option is just like today but each blanks row has tiny drawings of the outline and rocker. Though I think a
more visual option is going to be better. Essentially the pop up and the tab should read very similar to a blanks
catalog page with dims and all. But I kinda like the board horizontal rather than upright (maybe upright on the phone
only?)"*

And pasted a spec worked out in another chat, folded in here: a button showing the current blank's name and a small
thumbnail opens a scrollable popup of every blank that passes the length filter; each row shows the vendor and name,
length, center width and thickness, nose/tail rocker, and a small upright drawing of the outline and rocker side by side
drawn with the main view's curves; blanks that fail the thickness or fit check appear greyed with the reason, not hidden;
sorted by length, with filters for vendor, length range and nose rocker range; picking closes the popup and loads the
blank; on a phone a full-screen sheet, one column. (The other chat's "add this to the rocker prompt under PAGE ORDER"
refers to nothing in this project — no such prompt exists here.)

## Decided (the founder, 2026-10-15)

*"B Popup, stars follow your recommendation, default laying flat on all devices but give a vertical/horizontal toggle in
the filter. Scaling so each blank fills its card. Show my board on each blank should be an off/on toggle in the filter.
Theme and units follow the apps setting."*

- **B, the popup window** ★, opened from the blank button (name, maker, dims and a thumbnail) in the sidebar's BLANK
  section; on a phone it fills the screen.
- **Blanks lie flat by default on every device.** A **Flat / Upright** switch sits in the filter bar (on a computer
  beside the search with its words; on a phone two icons beside the search).
- **Each blank fills its card** (true proportion, never stretched). The one-scale option is dropped.
- **Show my board** is an on/off switch in the filter bar (beside Flat / Upright on a computer, in the chip row on a
  phone), **on by default** (the founder, minutes later: "show my board default = on."): your board's outline dashed
  on every blank where the app would place it.
- **Theme and units follow the app's own settings** — the popup has no switches of its own for them.
- **Stars**: saved on the shaper's account when signed in (a new nullable column on `user_preferences`, a list of
  blanks by maker and name, migrated on production before the deploy that reads it); in the browser alone when signed
  out, like Imperial/Metric; on signing in, the browser's stars join the account's. Starring never changes a board.

Round two of the sketch shows exactly this; round one's switches (upright on a phone only, one scale for all) are gone
from the page, and round one's page is kept in `sketch-source.tar.gz` as `template-round1.html`.

## How to View
open .planning/sketches/015-visual-blank-selector/index.html

Published for the phone (private to the founder's account): https://claude.ai/artifact/StzQyGahvLAMJmLK5zusU2 — on a
phone the mock-up fills the screen and follows how the phone is held (upright or sideways); Options holds the switches.

## Variants
- **A: A BLANKS tab beside VIEWER** — like TEMPLATE's WINGS tab. The sidebar's BLANK section becomes one button (the
  blank's name, maker, dims and a thumbnail) that opens the tab; the tab is the catalogue page. Picking a blank puts it
  on the board and returns to VIEWER.
- **B: A popup window ★ (the founder's pick)** — the same button opens a window holding the same catalogue page, as large as the screen allows;
  on a phone it fills the screen. Picking closes it and loads the blank; ✕, Esc or a click outside closes it unchanged.
- **C: Today's list, with drawings** — the sidebar list as it is today (intro, search, Fits / Won't fit, Show all), each
  row with a small thumbnail of the outline over the rocker and its nose and tail rocker. Starred blanks first.
- **All three side by side** — A, B and C at the same device size, each shrunk to fit, still working.

The catalogue page (A and B): a search box; the four makers as chips (the same setting as Settings → Blank Makers, at
least one kept on); a length range; a nose-rocker range; "★ Starred only"; a sort (length by default, nose rocker,
center thickness, volume). Groups: **★ Starred**, **Fits this board**, **Won't fit this board** (greyed, the reason in
the warning ink — too wide somewhere, or too thin at the center). Each card: name, volume, maker, the drawing, a line
of length and tip rockers, and the printed station table (Nose, N 12", Center, T 12", Tail × width, thickness, rocker).
The ☆ in a card's corner stars it.

**Switches in the sketch bar:** Device (computer 1280 × 800, upright phone 390 × 664 page, sideways phone 844 × 340
page); Blanks drawn (lying flat, upright on a phone only — the default, upright everywhere); Scale (each blank fills its
card, or one scale for every card like the Board Rack); Your board (a new 6'0", or the four presets — the Fish shows all
three kinds of verdict, the Longboard far fewer blanks); Show my board on each blank (your outline dashed on every
blank where the app would place it). Theme, units and stars are in ⚙ Sketch tools.

## The data
All 219 pickable blanks (US Blanks 101, Millennium Foam 61, Arctic Foam 33, Marko Foam 24; four Marko SUP blanks lack
the thicknesses to be picked), each drawn from its printed stations with the app's own curves (`prepareBlank`, the live
square-root rule, round noses included), at true proportion. Which blanks are listed and why a greyed one won't fit come
from the app's own `listBlanks` / `floorCheck` / `formatShortfall` for each board; only blanks too short are left out.
The too-thin sentence is the sketch's own wording (today the list hides those blanks). The VIEWER and DATASHEET are
stand-ins, not part of the question. Scripts in `sketch-source.tar.gz` (run `blank-data.ts` from the repo root with
`npx --no-install tsx --tsconfig ./tsconfig.json`, then `build015.mjs <out dir>`; `publish015.py` makes the phone copy).

## What to Look For
- On a computer, does the catalogue page read better in its own tab (A — the drawing area, the sidebar still beside it)
  or in a window (B — nearly the whole screen, three columns)? A keeps you on one page; B gets more room.
- On an upright phone, A's tab has only the drawing area above the controls (one card at a time); B's window has the
  whole screen. C keeps everything in the scrolling controls.
- Held sideways, the screen is about 340 dots tall: which still works?
- Lying flat versus upright on the phone: flat cards are a catalogue page but take most of the screen each; upright rows
  (your earlier spec) fit three or four to a screen with the numbers beside the drawing.
- Stars: do they belong in their own group at the top (as drawn), and is "★ Starred only" needed?

## Open Questions
- **Where stars are saved** (asked of the founder with the sketch): signed in, on the shaper's account so they follow
  to any device; signed out, in the browser, like Imperial/Metric. See MANIFEST.
- Should the too-thin blanks the spec greys (today they're hidden) count in "Fits / Won't fit", or sit in a third group?
