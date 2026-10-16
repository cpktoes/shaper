---
spike: 001
idea: custom-rocker
name: maker-rocker-conventions
type: standard
validates: "Given the four blank makers' catalogues and their own websites, when every rocker section is read, then we know how each maker names, measures, changes and charges for a rocker — and whether one app-wide way of writing a custom rocker can cover all four"
verdict: VALIDATED
related: [002]
tags: [rocker, blank, catalogue, custom-rocker, us-blanks, arctic-foam, marko-foam, millennium-foam]
---

# Spike 001: How the four blank makers handle rocker

Read 2026-10-16 for the founder's question: *"Is there consistency between the naming/functionality that we can take
advantage of to append a blank name with the custom rocker values and show what that would look like in our app viewer?"*

No earlier session had read these sections; earlier work only lifted the dimension tables into `db/seed/blanks/*.csv`.

## What This Validates
Given the four catalogues (and each maker's website where the catalogue is silent), when every rocker section is read,
then we know, maker by maker: what "natural rocker" means, whether and how a custom rocker is ordered, how it is
written, how rocker is measured, and any charges or limits.

## Short answer for the founder

**Yes, there is enough common ground for one way of writing it, but not one way of making it.**

- **Three makers work the same way: start from the natural rocker and add or take away lift.** US Blanks publishes the
  exact way to write it, and a list for every blank of the custom rockers it already has. Each is named as the blank
  plus the change, for example `9'4"B -1/2"N24" Rocker`. Millennium's catalogue asks for the same thing: plus or minus,
  at a point, measured from the centre if you don't say where. Its own store writes real orders that way. Marko only
  says its rockers "can be adjusted to your specifications", with no format of its own.
- **Arctic Foam works differently.** It keeps a library of named stock rockers (NAT, HG9, M06, M07, ROR-05, NOSERIDER
  and about 65 more). Each one has full figures at the nose tip, 12" from the nose, 12" from the tail and the tail tip,
  and is published per blank on its website. These are whole rocker shapes, not changes. They can still be shown as
  changes from the natural rocker at those four stations.
- **All four measure rocker the same way the app already does:** height above a flat line under the blank, with the
  lowest point reading 0. Three print the centre as 0. Marko prints the centre as 0.21" on two blanks, because its
  lowest point sits slightly off-centre.

## By maker

### US Blanks (catalogue `US-Blanks-Catalog-Letter-Size-June-2025-v2-1.pdf`, plus usblanks.com)

- **The PDF starts at catalogue page 13**, so the front pages (where ordering rules would live) are not in it. The rules
  below come from usblanks.com.
- **Natural rocker** is printed on every blank page as rise at the nose tip and the tail tip, e.g. `5 5/16"N 1 3/4"T`
  (6'8"A). The drawing's rocker column prints no figure at the centre, so the centre is 0. All ten listings checked
  match the catalogue's N0/T0 to within 1/64", except the two thick X versions (below).
- **One blank prints two rockers.** The 5'0"W prints `WAKE SURF ROCKER 2 5/8"N 1"T` and `NATURAL ROCKER 2 7/16"N 1"T`.
  The drawing shows the wake-surf one, and our CSV already says so in its flag.
- **Named alternatives in the catalogue text.** "The Hawaii Rocker can be used for high-performance designs" appears on
  14 Pat Rawson blanks: 6'8"A/AX, 7'0"A, 7'1"A, 7'1"EA, 7'5"A, 7'7"A, 7'11"A, 8'5"A, 9'2"A, 9'9"A/AX and
  10'6"A/AX. No figures are given anywhere.
- **Limits in the catalogue text:**
  - The Yater longboard pages warn that the further you change the natural rocker, "the wider the wood stringer it
    needs to hold it from springback".
  - Superfused EPS is moulded with extra foam at the nose and tail, so custom rockers are shaped in rather than bent.
    The 6'5" EPS "will accept subtle rocker adjustments from center".
  - Block-cut EPS blanks outside the stock list carry "a singe-cut fee and possible file fee" (their spelling).
- **usblanks.com "Rocker Selection" page** (`/blank-options/rocker-selection/`):
  - Custom rockers are free, including private rocker templates.
  - "All Custom Rockers are written as adjustments from the Natural Rocker."
  - Nose first, then tail: `+1/2"N +1/8"T` means 1/2" more at the nose and 1/8" more at the tail, measured from the
    centre.
  - A number after the N or T is how far from the tip the change starts: `+1/2"N18"` changes only the last 18" of the
    nose.
  - Changes can be stacked: `+1/2"N18" +1/2"N12"`.
  - Adjustments are made through the deck line by default, from the deck centre.
  - Moving a rocker between sizes needs a "match point".
  - Radical changes "may result in bumps or dips" in the deck line.
- **"Public Rocker Listing" per blank** (each blank page's *Available rockers* PDF, July 2026). Seven sheets were read,
  282 lines covering 10 blanks; they are copied verbatim in `usb-public-rocker-listings.txt`. Four kinds turn up:
  1. **Changes from natural (most of them):** `6'4"EA -1/2"N12" +1/2"T24" Rocker`, `9'4"B -1/4"N18" +1/8"T36" +1/8"T18"
     Rocker`, `5'10"RP -1/8"N12" -1/8"N6" -1/4"N3" Rocker`.
  2. **Named, with no figures:** Hawaii, Hawaii Waikiki, Reverse, TM Flat, TM Standard, Tow-In, Classic Frye, Small Frye.
     Sometimes a name carries a change too: `TM Flat +3/4"T24"`, `Reverse -1T`.
  3. **Another blank's curve:** `9'3"Y 94B B/C Rocker`, `9'3"Y CF 95S B/C Rocker` (CF most likely Clark Foam). Our
     reading: B/C is the bottom curve and D/C the deck curve of the named blank. B/T and D/N are not explained.
  4. **The natural rocker line:** `9'3"Y Natural Rocker N 4-5/16" T 3-1/4"`.
- **The X blanks' natural rocker differs from the catalogue page.** The listing gives the 6'8"AX `N 5-1/2" T 1-13/16"`,
  but the catalogue page prints the 6'8"A's `5 5/16"N 1 3/4"T`. It gives the 9'9"AX `7-3/4" / 3-1/4"`, against
  `7 11/16" / 3 1/8"` printed. Our CSV follows the page.
- The writing is loose: inch marks get dropped (`-1"N32 +1/2"T28`, `+1/2T24"`), spaces turn up inside (`- 1/4"T`,
  `-1/4"N 24"`), and one line ends without the word "Rocker". The spike's reader handles all 282 lines (spike 002).

### Millennium Foam (`MILL FULL CATALOG 2024 VR 9.27_opt.pdf`, plus millenniumfoam.com)

- **Page 8, "Rockers":**
  - "Millennium Foam has full custom rocker capabilities."
  - "We accept plus or minus adjustments based off our catalog naturals."
  - "Specify adjustment measurement and the point of adjustment." If no point is given, the rocker is "adjusted from
    center".
  - They also build rockers from Shape3d or AKU files, and cut new rocker masters on a CNC router.
- **The page's own diagram** is the 5'3"G natural rocker: nose 5 1/16" and tail 1 7/8", matching our CSV, with stations
  6", 12", 18" and 24" in from each tip over a CENTER baseline. It shows one change made at the tip and a "multiple
  location adjustment" made at 12" and 18".
- **Page 11, blank markings:** the bottom of the blank carries the size, then the special rocker or stringer, then the
  customer's mark. The example is `6.1` over `+3/4"T` (that is, 6'1" with 3/4" more tail rocker).
- **Page 2's photo caption is a full order line:** `61DG RED 1/8 PLY NATURAL ROCKER` (blank, density colour, stringer,
  rocker).
- **Page 10:** check rocker figures when comparing blanks across makers; if they differ, the rocker "can be adjusted on
  request".
- **Per-blank remarks:**
  - The 8'10"M and 9'0"M are "Also available with a 'Classic' rocker profile" (no figures).
  - The 63S "Does not accept rocker accelerations well".
  - The 113P and 122P say "Not all rockers will fit on cedar".
  - Balsa stringers: "Many rockers will require splicing".
  - Several blanks say they take rocker adjustments well.
- **Store titles** (millenniumfoam.com, real orders) all read blank · density · stringer · rocker:
  - `79P BLUE 1/8 Cedar -3/4 N rocker`
  - `73DG YELLOW 3/16 Bass +1/2 NOSE +1/2 TAIL Rocker`
  - `93P RED 1/8 Bass +1/2" nose @ 14" rocker`
  - `99P GREEN … -1/2 N + 3/8 T rocker`
  - `810M GREEN 1/2 Bass -1 NOSE rocker`
  - Named shop templates: `PADILLAC`, `HK`, `RUDDY`, `KIRBY 106`, `Forster 99Y`
  - Absolute figures: `2.5" nose 3" tail rocker`, `0" @ NOSE, 1" from center @ TAIL`
- **Charges:** none printed for rocker. The store can upload a file for a custom rocker. `stores.millenniumfoam.com`
  did not resolve on 2026-10-16; the main site did.

### Arctic Foam (`2024Catalog.pdf`, plus arcticfoam.us)

- **Every catalogue page names a "Perfered Stock Rocker"** (their spelling): NAT on 25 blanks, HG9 on four (5'8" SB,
  7'0" SB, 7'4" SB, 8'0" SB) and M06 on four (6'0" SB, 6'1" SBP, 6'4" SBM, 6'8" SBM). The catalogue never explains the
  codes.
- **The website explains them.** Each blank on the Shortboard, Fish, Egg, Longboard and Gun Rockers pages has a table:
  `ROCKER NAME | NOSE 0" | NOSE 12" | TAIL 12" | TAIL 0"`, one row per stock rocker. The row marked "(shown in pic)" is
  the one drawn. There are about 70 rocker names across 33 blanks; names repeat across blanks but the figures are
  per-blank. Two tables were checked by eye:
  - 5'8" SB: `HG9 (shown in pic) 5 · 1 3/16 · 13/16 · 2 1/4`, `NAT 4 3/8 · 1 1/8 · 3/4 · 2`, and 11 more. Arctic's own
    R3 row prints 1 7/8 at the tail 12" station, which looks like a slip on their page.
  - 9'3" LB: `NAT (shown in pic) 4 9/16 · 2 1/16 · 1 7/8 · 3 1/2`, plus BORST, BI HOPPER, LSP, ROR-02, HP, HY NECTAR,
    MARTIN, NOSERIDER, NR and YATER.
  - The other 31 tables are machine-read in `arctic-rocker-tables-ocr.txt` and are not proofread.
- **The catalogue and the website don't always agree.** For the 9'3" LB the catalogue's figures are the website's NAT
  to within 1/16". For the 6'4" SBM they match its M06 row to within 1/16". But the 5'8" SB catalogue page (labelled
  HG9) prints `4 7/8 · 1 1/2 · 13/16 · 1 7/8`, which is neither HG9 nor NAT on the website (up to 3/8" off at a
  station). The 6'8" SBM page is labelled M06 but matches the website's HG9 row exactly (`4 13/16 · 1 1/2 · 1 1/8 ·
  2 5/16`, checked by eye). The website tables are dated 2023 screenshots, and the
  catalogue says measurements "may vary slightly". Which rocker the 2024 drawings show is a question for Arctic.
- **Measured from the centre:** the drawing's rocker column prints no centre figure.
- **Charges and limits:** none printed. The website FAQ says custom orders are made after the order is placed, and to
  contact them for prices.
- **Descriptions:** blanks carry thickness at the nose and tail "to accommodate various rocker designs". The LB pages
  say "The natural and noserider rockers work well", and the 10'2" LB's natural "was based off of our very popular
  noserider rocker".

### Marko Foam (`marko_foam_2026_catalog.pdf`)

- The front pages (1–17) cover shipping, payment, densities and **stringer up-charges** (a price table). There's no
  rocker section.
- **"How to read our blanks" (p18)** labels the moulded blank's sticker: part number, density, material, weight, board
  number, shift and date. There's no rocker field.
- Blank pages (19–48 are pictures; read with the Mac's text recognition and by eye):
  - 9'1" Machine All: "Natural rocker can be altered to meet your needs."
  - The slab-cut SUP blanks (8'0"–12'0" MK-SUP-STD) are "glued with our stock rocker that can be adjusted to your
    specifications".
  - The 10'2" M is "able to accommodate both longboard and gun rockers".
  - Several shortboards describe a "relaxed rocker".
  - No codes, no notation and no charges.
- **How Marko measures:** the 10'2" M (p34) draws a flat line under the bottom. The curve touches it between the centre
  and the 24" station on the right of the page, and the figures read from that line: centre `0.21`, 24" stations `1.89`
  and `0.61`, tips `4.98` and `4.55`. So the printed centre 0.21" (just over 3/16") is real: Marko measures from the
  blank's lowest point, not from the centre. The 10'2" M Thick does the same, and the Wakesurf Regular and 5'3" Foil
  print 0.02. The app already levels every blank so its lowest point reads 0, and the 10'2" M then reads 0 at its
  centre station, its lowest printed point.

## Research
| Source | What it gave |
|---|---|
| The four catalogue PDFs (copies in the session scratchpad; pypdf text, PDFKit renders, Vision text recognition) | Everything quoted from the catalogues above |
| usblanks.com `/blank-options/rocker-selection/` | The notation, "from centre" default, free custom rockers |
| usblanks.com per-blank "Available rockers" PDFs (7 read) | The Public Rocker Listing — real stocked custom rockers, named blank + change |
| arcticfoam.us rocker pages (33 table images) | What NAT / HG9 / M06 / … are, with figures |
| millenniumfoam.com store titles (search results) | How real Millennium orders are written |
| swaylocks.com threads (search snippets only; the site refuses fetching) | Shapers' shorthand, e.g. "98Y -1N, +1/2T" — anecdotal, matches US Blanks' notation |

## How to Run
Nothing to run here; the evidence files sit beside this README. Spike 002's archive holds the reading scripts.

## Investigation Trail
1. pypdf text from all four catalogues. Millennium (pp. 7–11) and Arctic (one code line per page) had real rocker text.
   US Blanks had only per-blank remarks: its PDF begins at catalogue page 13. Marko's text pages had none.
2. Rendered Millennium pp. 2, 6, 8 and 11 and Marko p18 and p34. Read the diagram, the marking page and the 10'2" M.
3. Text-recognised all 30 Marko blank pages and read the description boxes. The only rocker lines are the three quoted
   above.
4. The catalogues didn't say what Arctic's codes are or what US Blanks' rules are, so I went to the makers' websites.
   US Blanks' Rocker Selection page and per-blank listings were the key find: an official, published "blank name +
   change" naming, already in use for hundreds of real rockers.
5. Arctic's rocker pages hold their tables only as pictures. They were captured with headless Playwright from the
   repo's own install (the Browser pane can't screenshot a local page), text-recognised, and two tables checked by
   eye.
6. Compared Arctic's catalogue rockers against its website tables, and US Blanks' listed naturals against the catalogue
   (`spike-source.tar.gz` → `arctic_codes.py` and `custom-rocker-spike.mts`).

## Results
**VALIDATED.** The conventions are known well enough to design from.

**Surprises**
- US Blanks already does exactly what the founder described: every stocked custom rocker is named as the catalogue
  name plus the change.
- Arctic's catalogue figures don't always match the stock rocker the page names.
- US Blanks' X blanks list a different natural rocker from the one their catalogue page prints.
- Marko measures from the lowest point, which explains the 10'2" M's 0.21" centre.

**Still unknown**
- What B/T and D/N mean.
- What the named-only rockers (Hawaii, TM Flat, Frye, Classic, …) look like.
- How a maker's rocker table actually bends between the bend point and the tip.
- Whether Millennium or Arctic charge for a custom rocker.
