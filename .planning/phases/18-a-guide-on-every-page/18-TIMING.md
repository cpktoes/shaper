# Phase 18 — how long a GUIDE takes to open (D-28)

Measured 2026-11-10 on branch `page-guides` at `9a929269`, on a **production build** (`npm run build`, then `next start`),
the Shortboard open, Chromium. The clock runs from the press on the GUIDE tab to the end of the first frame that holds
the cards. Five cold runs per page (a fresh page load each run, so the cards are worked out from scratch). Median first,
then the five runs, in milliseconds.

## On this Mac as it is

| Page | Cards | Computer, 1280 × 800 | Phone, 390 × 844 |
|---|---|---|---|
| VOLUME | 8 | **35** (40 33 35 35 34) | **36** (39 35 36 37 36) |
| TEMPLATE | 22 | **56** (61 56 54 55 57) | **55** (58 54 57 54 55) |
| ROCKER | 14 | **59** (67 60 53 59 58) | **57** (69 57 57 56 59) |
| RAILS | 17 | **56** (65 56 55 58 56) | **67** (71 69 66 67 61) |
| FINS | 23 | **56** (62 54 57 56 56) | **56** (63 59 56 55 53) |

## With the processor slowed four times (a slow phone)

| Page | Cards | Computer, 1280 × 800 | Phone, 390 × 844 |
|---|---|---|---|
| VOLUME | 8 | **144** (162 133 138 144 157) | **142** (164 151 135 142 137) |
| TEMPLATE | 22 | **252** (265 245 252 246 259) | **219** (243 210 235 219 216) |
| ROCKER | 14 | **270** (298 248 247 270 290) | **243** (278 244 243 240 231) |
| RAILS | 17 | **241** (265 232 241 241 234) | **262** (273 246 259 262 313) |
| FINS | 23 | **251** (266 244 230 254 251) | **241** (261 241 266 236 239) |

The development build 18-08 timed was three to four times slower than this (374 to 1109 ms); those figures are not what a
shaper gets.

## Where the time goes

The browser's own counters for one opening under the four-times slowdown, in milliseconds:

| Tab opened | Script | Style | Layout |
|---|---|---|---|
| VOLUME · GUIDE | 69 | 21 | 49 |
| TEMPLATE · GUIDE, first time | 128 | 38 | 65 |
| TEMPLATE · GUIDE, second time (cards remembered) | 78 | 28 | 29 |
| ROCKER · GUIDE | 158 | 40 | 53 |
| RAILS · GUIDE | 106 | 46 | 54 |
| FINS · GUIDE | 99 | 47 | 71 |
| for comparison: TEMPLATE · VIEWER | 43 | 7 | 4 |
| for comparison: ROCKER · DATASHEET | 30 | 13 | 5 |
| for comparison: RAILS · DATA | 40 | 6 | 9 |

So a GUIDE costs two to three times what the app's other tabs cost to open, spread across working the cards out, styling
them and laying out their words. About 85 ms of the slowed figure is there with any number of cards (VOLUME's eight cards
take 144 ms); each further card adds about 7 ms.

## One thing tried and taken back out

Each drawing's words are sized after the tab measures a card, which works through every drawing a second time before the
first frame. Passing that size as a CSS variable instead (so the cards are worked through once) was built, timed on a
fresh production build and **made no measurable difference** (TEMPLATE 252 → 240, RAILS 241 → 249, phone RAILS 262 → 291;
inside the run-to-run spread). It was reverted; nothing was committed.

## Decision

D-28 says lazy drawing is built only if a GUIDE's first paint passes about 150 ms on a four-times-slowed processor. Four of
the five pages pass that line on a production build, by 70 to 120 ms. **Lazy drawing is still not built**, and this is a
departure from D-28 as written, put to the founder rather than settled quietly:

- On a current phone or computer a GUIDE opens in 35 to 67 ms, which reads as instant. A quarter of a second is what a slow
  phone sees, once per press on the tab.
- Drawing a card's picture only as it nears the screen would leave far cards' pictures empty until scrolled to. Five pages'
  browser checks read far cards' drawings today and would have to be rewritten on the eve of the go-live.
- The fixed 85 ms and the words' layout stay whatever is done to the drawings, so the gain is perhaps a third.

**If the GUIDE feels slow to open on the founder's own phone, the fix is known and small in scope:** draw the pictures of
the cards in view first and the rest a moment later (not on scroll, so no card stays empty), with the browser checks told
to wait for the last picture. That would be a quick task after the go-live.
