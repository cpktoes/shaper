# Blank catalogue-link audit — 2026-11-14

Read-only audit of the `catalog_slug` column in the three seed files against the makers' live sites. Every URL below was fetched with curl (Mozilla UA, one request at a time) and its `<title>` read; "verified" means HTTP 200 and the title names that blank. Arctic Foam skipped (one catalogue PDF, no per-blank pages).

Seed files: `/Users/kontoes/Code/shaper/db/seed/blanks/us_blanks_stations.csv`, `marko_foam_stations.csv`, `millennium_foam_stations.csv`. Raw fetch logs beside this file: `us_seed_pass.tsv`, `us_match.tsv`, `marko_verify.tsv`, `millennium_verify.tsv`, `usblanks-grid.json`, `marko-products-json.json`, `millennium-links.json`, `millennium-sitemap-products.txt`.

## US Blanks — 101 blanks

Page pattern: `https://usblanks.com/catalog/<series>/<slug>/`. The site accepts the slug in either case (`/longboards/94B/` and `/longboards/94b/` both 200), and links without `/catalog/` (`/longboards/94b/`) redirect to the `/catalog/` form. Every series listing page carries the same grid of all blanks, so one listing was enough to recover every real slug. Slugs are hand-made on the site: some are run together (`60p`, `63ea`), some hyphenated (`5-9-p`, `6-2-ax`, `7-8-a`), two carry a WordPress `-2` suffix (`5-11-yu-2`, `6-4-eax-2`), and the Superfused EPS pages live under `/catalog/superfused/` except one under `/catalog/superfused-eps/`.

| blank_name | seed catalog_slug | verified live page | status |
|---|---|---|---|
| 5'0"W | `wake-surf/5-0-W` | https://usblanks.com/catalog/wake-surf/5-0-w/ | ok |
| 5'9"P | `shortboard/5-9-P` | https://usblanks.com/catalog/shortboard/5-9-p/ | ok |
| 5'10"RP | `fish-egss/510RP` | https://usblanks.com/catalog/fish-eggs/510rp/ | wrong slug — correct one is `fish-eggs/510rp` (seed URL is 404) |
| 5'11"YU | `shortboard/5-11-YU` | https://usblanks.com/catalog/shortboard/5-11-yu-2/ | wrong slug — correct one is `shortboard/5-11-yu-2` (seed URL is 404) |
| 6'0"P | `shortboard/6-0P` | https://usblanks.com/catalog/shortboard/60p/ | wrong slug — correct one is `shortboard/60p` (seed URL is 404) |
| 6'0"R | `shortboard/60R` | https://usblanks.com/catalog/shortboard/60r/ | ok |
| 6'2"A | `fish-egg/6-2A` | https://usblanks.com/catalog/fish-eggs/62a/ | wrong slug — correct one is `fish-eggs/62a` (seed URL is 404) |
| 6'2"AX | `fish-egg/6-2-AX` | https://usblanks.com/catalog/fish-eggs/6-2-ax/ | wrong slug — correct one is `fish-eggs/6-2-ax` (seed URL is 404) |
| 6'2"P | `shortboard/6-2P` | https://usblanks.com/catalog/shortboard/62p/ | wrong slug — correct one is `shortboard/62p` (seed URL is 404) |
| 6'3"EA | `shortboard/6-3EA` | https://usblanks.com/catalog/shortboard/63ea/ | wrong slug — correct one is `shortboard/63ea` (seed URL is 404) |
| 6'3"RP | `fish-egg/6-3-rp` | https://usblanks.com/catalog/fish-eggs/6-3-rp/ | wrong slug — correct one is `fish-eggs/6-3-rp` (seed URL is 404) |
| 6'4"EA | `shortboard/6-4EA` | https://usblanks.com/catalog/shortboard/64ea/ | wrong slug — correct one is `shortboard/64ea` (seed URL is 404) |
| 6'4"EAX | `shortboard/6-4EAX` | https://usblanks.com/catalog/shortboard/6-4-eax-2/ | wrong slug — correct one is `shortboard/6-4-eax-2` (seed URL is 404) |
| 6'4"MB | `shortboard/6-4MB` | https://usblanks.com/catalog/shortboard/64mb/ | wrong slug — correct one is `shortboard/64mb` (seed URL is 404) |
| 6'5"A | `fish-eggs/6-5A` | https://usblanks.com/catalog/fish-eggs/65a/ | wrong slug — correct one is `fish-eggs/65a` (seed URL is 404) |
| 6'5"AX | `fish-eggs/6-5-AX` | https://usblanks.com/catalog/fish-eggs/6-5-ax/ | ok |
| 6'5"R | `shortboard/6-5R` | https://usblanks.com/catalog/shortboard/65r/ | wrong slug — correct one is `shortboard/65r` (seed URL is 404) |
| 6'6"EA | `shortboard/6-6EA` | https://usblanks.com/catalog/shortboard/66ea/ | wrong slug — correct one is `shortboard/66ea` (seed URL is 404) |
| 6'7"P | `shortboard/6-7P` | https://usblanks.com/catalog/shortboard/67p/ | wrong slug — correct one is `shortboard/67p` (seed URL is 404) |
| 6'8"A | `shortboard/6-8A` | https://usblanks.com/catalog/shortboard/68a/ | wrong slug — correct one is `shortboard/68a` (seed URL is 404) |
| 6'8"AX | `shortboard/6-8AX` | https://usblanks.com/catalog/shortboard/68ax/ | wrong slug — correct one is `shortboard/68ax` (seed URL is 404) |
| 6'8"P | `shortboard/68P` | https://usblanks.com/catalog/shortboard/68p/ | ok |
| 6'8"RP | `fish-eggs/68RP` | https://usblanks.com/catalog/fish-eggs/68rp/ | ok |
| 6'9"EA | `shortboard/69EA` | https://usblanks.com/catalog/shortboard/69ea/ | ok |
| 6'9"EAX | `shortboard/69EA` | https://usblanks.com/catalog/shortboard/6-9-eax/ | wrong slug — correct one is `shortboard/6-9-eax` (seed URL is 200 but is the **6' 9" EA** page, not this blank) |
| 6'9"R | `shortboard/69R` | https://usblanks.com/catalog/shortboard/69r/ | ok |
| 6'10"A | `fish-eggs/610A` | https://usblanks.com/catalog/fish-eggs/610a/ | ok |
| 6'10"RH | `fish-eggs/610-RH` | https://usblanks.com/catalog/fish-eggs/610-rh/ | ok |
| 7'0"A | `shortboards/70A` | https://usblanks.com/catalog/shortboard/70a/ | wrong slug — correct one is `shortboard/70a` (seed URL is 404) |
| 7'1"A | `shortboards/71A` | https://usblanks.com/catalog/shortboard/71a/ | wrong slug — correct one is `shortboard/71a` (seed URL is 404) |
| 7'1"EA | `fun-boards/71EA` | https://usblanks.com/catalog/fun-boards/71ea/ | ok |
| 7'2"EA | `guns/72EA` | https://usblanks.com/catalog/guns/72ea/ | ok |
| 7'2"EAX | `guns/7-2-EAX` | https://usblanks.com/catalog/guns/7-2-eax/ | ok |
| 7'3"A | `fish-eggs/73A` | https://usblanks.com/catalog/fish-eggs/73a/ | ok |
| 7'4"SP | `fish-eggs/74SP` | https://usblanks.com/catalog/fish-eggs/74sp/ | ok |
| 7'5"A | `fun-boards/75A` | https://usblanks.com/catalog/fun-boards/75a/ | ok |
| 7'6"EA | `fun-boards/76EA` | https://usblanks.com/catalog/fun-boards/76-ea/ | wrong slug — correct one is `fun-boards/76-ea` (seed URL is 404) |
| 7'6"EAX | `fun-boards/7-6-EAX` | https://usblanks.com/catalog/fun-boards/7-6-eax/ | ok |
| 7'7"A | `fun-boards/77A` | https://usblanks.com/catalog/fun-boards/77a/ | ok |
| 7'8"A | `fun-boards/78A` | https://usblanks.com/catalog/fun-boards/7-8-a/ | wrong slug — correct one is `fun-boards/7-8-a` (seed URL is 404) |
| 7'8"EA | `guns/78EA` | https://usblanks.com/catalog/guns/78ea/ | ok |
| 7'9"H | `fish-eggs/79H` | https://usblanks.com/catalog/fish-eggs/79h/ | ok |
| 7'9"HX | `fish-eggs/79HX` | https://usblanks.com/catalog/fish-eggs/79hx/ | ok |
| 7'10"SP | `fish-eggs/710SP` | https://usblanks.com/catalog/fish-eggs/710sp/ | ok |
| 7'11"A | `guns/711A` | https://usblanks.com/catalog/guns/711a/ | ok |
| 8'0"H | `fish-eggs/80H` | https://usblanks.com/catalog/fish-eggs/80h/ | ok |
| 8'1"EA | `fun-boards/81EA` | https://usblanks.com/catalog/fun-boards/81ea/ | ok |
| 8'2"A | `fun-boards/82A` | https://usblanks.com/catalog/fun-boards/82a/ | ok |
| 8'2"AX | `fun-boards/82AX` | https://usblanks.com/catalog/fun-boards/8-2-ax/ | wrong slug — correct one is `fun-boards/8-2-ax` (seed URL is 404) |
| 8'3"H | `fun-boards/83H` | https://usblanks.com/catalog/fun-boards/83h/ | ok |
| 8'4"SP | `fish-eggs/84SP` | https://usblanks.com/catalog/fish-eggs/84sp/ | ok |
| 8'4"SPX | `fish-eggs/84SPX` | https://usblanks.com/catalog/fish-eggs/84spx/ | ok |
| 8'5"A | `fun-boards/85A` | https://usblanks.com/catalog/guns/85a/ | wrong slug — correct one is `guns/85a` (seed URL is 404) |
| 8'6"EA | `fun-boards/86EA` | https://usblanks.com/catalog/fun-boards/86ea/ | ok |
| 8'9"Y | `longboards/89Y` | https://usblanks.com/catalog/longboards/89y/ | ok |
| 8'9"YX | `longboards/89YX` | https://usblanks.com/catalog/longboards/89yx/ | ok |
| 9'2"A | `guns/92A` | https://usblanks.com/catalog/guns/92a/ | ok |
| 9'3"A | `fun-boards/93A` | https://usblanks.com/catalog/fun-boards/93a/ | ok |
| 9'3"AX | `fun-boards/93AX` | https://usblanks.com/catalog/fun-boards/93ax/ | ok |
| 9'3"Y | `longboards/93Y` | https://usblanks.com/catalog/longboards/93y/ | ok |
| 9'4"B | `longboards/94B` | https://usblanks.com/catalog/longboards/94b/ | ok |
| 9'5"M | `longboards/95M` | https://usblanks.com/catalog/longboards/95m/ | ok |
| 9'8"Y | `longboards/98Y` | https://usblanks.com/catalog/longboards/98y/ | ok |
| 9'9"A | `guns/99A` | https://usblanks.com/catalog/guns/99a/ | ok |
| 9'9"AX | `guns/99AX` | https://usblanks.com/catalog/guns/99ax/ | ok |
| 9'9"B | `guns/99B` | https://usblanks.com/catalog/longboards/99b/ | wrong slug — correct one is `longboards/99b` (seed URL is 404) |
| 10'0"BG | `guns/100BG` | https://usblanks.com/catalog/guns/100bg/ | ok |
| 10'1"C | `longboards/101C` | https://usblanks.com/catalog/longboards/101c/ | ok |
| 10'2"B | `longboards/102B` | https://usblanks.com/catalog/longboards/102b/ | ok |
| 10'2"BX | `longboards/102BX` | https://usblanks.com/catalog/longboards/102bx/ | ok |
| 10'6"A | `guns/106A` | https://usblanks.com/catalog/guns/106a/ | ok |
| 10'6"AX | `guns/106AX` | https://usblanks.com/catalog/guns/106ax/ | ok |
| 10'8"BG | `guns/108BG` | https://usblanks.com/catalog/guns/108bg/ | ok |
| 10'8"C | `longboards/108C` | https://usblanks.com/catalog/longboards/108c/ | ok |
| 10'8"Y | `longboards/108Y` | https://usblanks.com/catalog/longboards/108y/ | ok |
| 10'10"T | `sups/1010T` | https://usblanks.com/catalog/sups/1010t/ | ok |
| 11'2"C | `longboards/112C` | https://usblanks.com/catalog/longboards/112-c/ | wrong slug — correct one is `longboards/112-c` (seed URL is 404) |
| 11'8"BG | `guns/108BG` | https://usblanks.com/catalog/guns/118bg/ | wrong slug — correct one is `guns/118bg` (seed URL is 200 but is the **10' 8" BG** page, not this blank) |
| 11'8"C | `longboards/118C` | https://usblanks.com/catalog/longboards/11-8-c/ | wrong slug — correct one is `longboards/11-8-c` (seed URL is 404) |
| 6'5" EPS | `superfused/65superfusedeps` | https://usblanks.com/catalog/superfused/65superfusedeps/ | ok |
| 6'5"X EPS | `superfused/65xsuperfusedeps` | https://usblanks.com/catalog/superfused/65xsuperfused/ | wrong slug — correct one is `superfused/65xsuperfused` (seed URL is 404) |
| 6'8" EPS | `superfused/68superfusedeps` | https://usblanks.com/catalog/superfused/68superfused/ | wrong slug — correct one is `superfused/68superfused` (seed URL is 404) |
| 6'8"X EPS | `superfused/68xsuperfusedeps` | https://usblanks.com/catalog/superfused/68xsuperfused/ | wrong slug — correct one is `superfused/68xsuperfused` (seed URL is 404) |
| 7'2" EPS | `superfused/72superfusedeps` | https://usblanks.com/catalog/superfused/72superfused/ | wrong slug — correct one is `superfused/72superfused` (seed URL is 404) |
| 7'2"X EPS | `superfused/72xsuperfusedeps` | https://usblanks.com/catalog/superfused/72xsuperfused/ | wrong slug — correct one is `superfused/72xsuperfused` (seed URL is 404) |
| 7'8" EPS | `superfused/78superfusedeps` | https://usblanks.com/catalog/superfused/78superfused/ | wrong slug — correct one is `superfused/78superfused` (seed URL is 404) |
| 7'8"X EPS | `superfused/78xsuperfusedeps` | https://usblanks.com/catalog/superfused/78xsuperfused/ | wrong slug — correct one is `superfused/78xsuperfused` (seed URL is 404) |
| 8'8" EPS | `superfused/88superfusedeps` | https://usblanks.com/catalog/superfused/88superfused/ | wrong slug — correct one is `superfused/88superfused` (seed URL is 404) |
| 8'8"X EPS | `superfused/88xsuperfusedeps` | https://usblanks.com/catalog/superfused-eps/8-8-x-superfused/ | wrong slug — correct one is `superfused-eps/8-8-x-superfused` (seed URL is 404) |
| 9'8" EPS | `superfused/98superfusedeps` | https://usblanks.com/catalog/superfused/98superfused/ | wrong slug — correct one is `superfused/98superfused` (seed URL is 404) |
| 9'8"X EPS | `superfused/98xsuperfusedeps` | https://usblanks.com/catalog/superfused/98xsuperfused/ | wrong slug — correct one is `superfused/98xsuperfused` (seed URL is 404) |
| 9'8"XX EPS | `superfused/98xxsuperfusedeps` | https://usblanks.com/catalog/superfused/98xxsuperfused/ | wrong slug — correct one is `superfused/98xxsuperfused` (seed URL is 404) |
| 8'6" EPS | `sups/86eps` | https://usblanks.com/catalog/sups/86eps/ | ok |
| 9'6" EPS | `sups/96eps` | https://usblanks.com/catalog/sups/96eps/ | ok |
| 10'0" EPS | `sups/100sup` | https://usblanks.com/catalog/sups/100sup/ | ok |
| 10'4"A SUP EPS | `sups/104supa` | https://usblanks.com/catalog/sups/104supa/ | ok |
| 10'4"B SUP EPS | `sups/104supb` | https://usblanks.com/catalog/sups/104supb/ | ok |
| 11'2"A SUP EPS | `sups/112supa` | https://usblanks.com/catalog/sups/112supa/ | ok |
| 11'2"B SUP EPS | `sups/112supb` | https://usblanks.com/catalog/sups/112supb/ | ok |
| 12'1" EPS | `sups/121sup` | https://usblanks.com/catalog/sups/121sup/ | ok |
| 12'6" EPS | `sups/126sup` | https://usblanks.com/catalog/sups/126sup/ | ok |

**US Blanks counts:** verified page for **101 of 101**; seed slug correct: **61**; seed slug wrong (page exists under another slug): **40**; no page: **0**.

Two of the wrong ones are the dangerous kind — the seed URL answers 200 but shows a different blank: `6'9"EAX` points at the 6'9" EA page (real slug `shortboard/6-9-eax`) and `11'8"BG` points at the 10'8" BG page (real slug `guns/118bg`). Series folders are also wrong in several seeds even where the slug part is right: `fish-egss`/`fish-egg` for `fish-eggs`, `shortboards` for `shortboard`, `8'5"A` is under `guns` not `fun-boards`, `9'9"B` is under `longboards` not `guns`.

## Marko Foam — 28 blanks

The seed `catalog_slug` for Marko is a catalogue-section label (`molded`, `block-cut`, `sup`), not a page slug, so no seed URL could be tried. Page pattern: `https://markofoamblanks.com/products/<handle>` (Shopify). The whole store is 39 products (`/products.json`), 24 of them blanks; the collection pages, the store search and the product JSON agree. Matches below are by title, with the page's own dimensions checked where the title differs from the seed name.

| blank_name | seed catalog_slug | verified live page (title) | status |
|---|---|---|---|
| Wakesurf Regular | `molded` | https://markofoamblanks.com/products/wakesurf-regular ("Wakesurf Regular") | ok (page dims 5'2.5" × 22.75" × 2.75") |
| 5'3" Foil | `molded` | https://markofoamblanks.com/products/wakesurf-thick ("5'3" Foil") | ok — note the handle says *thick* while the title is 5'3" Foil (dims 5'2.5" × 22.75" × 3.37") |
| 6'0" M-Regular | `molded` | https://markofoamblanks.com/products/60-m-regular ("6'0 M Regular") | ok |
| 6'0" M-Thick | `molded` | https://markofoamblanks.com/products/60-m-thick ("6'0 M Thick") | ok |
| 6'4" TP | `molded` | https://markofoamblanks.com/products/64-tp ("6'4 TP") | ok (6'4" × 21.63" × 2.98") |
| 6'4" TP Thick | `molded` | https://markofoamblanks.com/products/64-thick ("6'4'' Thick") | ok — title drops the TP, but dims 6'4" × 21.63" × 3.37" match the seed's 3.37" × 21.63" |
| 6'6" M | `molded` | https://markofoamblanks.com/products/66-m ("6'6 M") | ok |
| 6'9" Regular | `molded` | https://markofoamblanks.com/products/69-regular ("6'9'' Regular") | ok |
| 6'9" Thick | `molded` | https://markofoamblanks.com/products/69-thick ("6'9" Thick") | ok |
| 7'2" M Regular | `molded` | https://markofoamblanks.com/products/72-m ("7'2'' Regular") | ok (title says Regular, handle says M) |
| 7'2" M Thick | `molded` | https://markofoamblanks.com/products/72-m-thick ("7'2'' M Thick") | ok |
| 7'5" Machine All | `molded` | https://markofoamblanks.com/products/75-machin-all ("7'5'' Machine All") | ok (handle misspelt on their side) |
| 7'6" Thick | `molded` | https://markofoamblanks.com/products/76-thick ("7'6'' Thick") | ok |
| 8'5" Thick | `molded` | https://markofoamblanks.com/products/85-machinal-all ("8'5'' Thick") | ok — handle reads machinal-all, title 8'5'' Thick, dims 8'6.65" × 24.46" × 3.8" |
| 9'1" Machine All | `molded` | https://markofoamblanks.com/products/91-machine-all ("9'1'' Machine All") | ok |
| 10'2" M | `molded` | — | no page found — not among the store's 39 products |
| 10'2" M Thick | `molded` | — | no page found — not among the store's 39 products |
| 9'6" MK | `block-cut` | — | no page found — only MK 10'0'' and MK 10'10'' exist |
| 10'0" MK | `block-cut` | https://markofoamblanks.com/products/mk-100 ("MK 10'0''") | ok (page dims 10'1" × 25" × 3.8") |
| 10'10" MK | `block-cut` | https://markofoamblanks.com/products/mk-1010 ("MK 10'10''") | ok |
| 8'0" Gun | `block-cut` | — | no page found — store search for "gun" returns one product (9'6 Gun) |
| 9'6" Gun | `block-cut` | https://markofoamblanks.com/products/96-gun ("9'6 Gun") | ok by title — but the page's dims line reads 9' × 24" × 3.25", not the seed's 116" × 24" × 4.5" |
| 10'6" Gun | `block-cut` | — | no page found — store search for "gun" returns one product |
| 8'0" MK-SUP-STD | `sup` | https://markofoamblanks.com/products/80-sup ("8'0" SUP") | ok (96" × 33" × 5", Virgin EPS slab) |
| 9'0" MK-SUP-STD | `sup` | https://markofoamblanks.com/products/80-sup-1 ("9'0" SUP") | ok — handle says 80 but the title and dims (109") are the 9'0" |
| 10'0" MK-SUP-STD | `sup` | https://markofoamblanks.com/products/100-sup-1 ("10'0" SUP") | ok (120" × 32" × 5.5") |
| 11'0" MK-SUP-STD | `sup` | https://markofoamblanks.com/products/110-sup ("11'0" SUP") | ok (132" × 32" × 5.25") |
| 12'0" MK-SUP-STD | `sup` | https://markofoamblanks.com/products/120-sup ("12'0" SUP") | ok (144" × 32" × 5.64") |

**Marko counts:** verified page for **23 of 28**; seed slug wrong: **n/a** (the seed column holds no page slugs at all — all 28 need a handle added); no page: **5** (10'2" M, 10'2" M Thick, 9'6" MK, 8'0" Gun, 10'6" Gun). Unmatched store blank: `70-sup` (7'0" SUP) is on the site but not in the seed.

## Millennium Foam — 61 blanks

The seed `catalog_slug` is the model code (`50WS`, `611P`); the live store (BigCommerce) has one model page per code at `https://millenniumfoam.com/<irregular-slug>/`, plus hundreds of stock-configuration pages (`99p-blue-mob-3-8-cedar-natural-rocker/` and the like) that also start with the code. The table gives the model page — the one the size-range listings link under the plain code — and the slugs are irregular enough that none can be derived from the code (`53ws` is the 50WS, `77f` is the 77B, `711cb-2` is the 711CT).

| blank_name | seed catalog_slug | verified live page (title) | status |
|---|---|---|---|
| 5'0"WS | `50WS` | https://millenniumfoam.com/53ws/ ("Blanks - 5'3" to 6'2" long - 50WS") | ok — slug says 53ws, title says 50WS |
| 5'2"WS | `52WS` | https://millenniumfoam.com/52ws/ ("Blanks - 5'3" to 6'2" long - 52WS") | ok |
| 5'3"G | `53G` | https://millenniumfoam.com/53g-grom-shortboard/ ("Blanks - 5'3" to 6'2" long - 53G (Shortboard)") | ok |
| 5'8"R | `58R` | https://millenniumfoam.com/58r-shortboard/ ("Blanks - 5'3" to 6'2" long - 58R (Shortboard)") | ok |
| 5'10"F | `510F` | https://millenniumfoam.com/510f-fish/ ("Blanks - 5'3" to 6'2" long - 510F (Fish)") | ok |
| 6'0"DE | `60DE` | https://millenniumfoam.com/60de-sb-wider/ ("Blanks - 5'3" to 6'2" long - 60DE (Fish)") | ok (also a stock-config page: https://millenniumfoam.com/60de-red-1-8-bass-ply-blk-blk-blk-natural-rocker/) |
| 6'1"DG | `61DG` | https://millenniumfoam.com/61dg-shortboard-3/ ("Blanks - 5'3" to 6'2" long - 61DG (Shortboard)") | ok |
| 6'1"B | `61B` | https://millenniumfoam.com/61b-shortboard/ ("Blanks - 5'3" to 6'2" long - 61B (Shortboard)") | ok |
| 6'1"A | `61A` | https://millenniumfoam.com/61a-sb-wider/ ("Blanks - 5'3" to 6'2" long - 61A (Shortboard)") | ok |
| 6'2"F | `62F` | https://millenniumfoam.com/62f/ ("Blanks - 5'3" to 6'2" long - 62F (Fish)") | ok |
| 6'2"DT | `62DT` | https://millenniumfoam.com/62dt-fish-machine/ ("Blanks - 5'3" to 6'2" long - 62DT (Fish)") | ok |
| 6'3"S | `63S` | https://millenniumfoam.com/63s-fish/ ("Blanks - 6'3" to 6'6" long - 63S (Fish)") | ok |
| 6'3"DG | `63DG` | https://millenniumfoam.com/63dg-sb/ ("Blanks - 6'3" to 6'6" long - 63DG (Shortboard)") | ok |
| 6'4"P | `64P` | https://millenniumfoam.com/64p/ ("Millennium 6'4 P Shortboard Blank") | ok |
| 6'4"CT | `64CT` | https://millenniumfoam.com/64ct-shortboard/ ("Blanks - 6'3" to 6'6" long - 64CT (Shortboard)") | ok |
| 6'4"A | `64A` | https://millenniumfoam.com/64a-sb-machine/ ("Blanks - 6'3" to 6'6" long - 64A (Shortboard)") | ok |
| 6'5"F | `65F` | https://millenniumfoam.com/65f-fish/ ("Blanks - 6'3" to 6'6" long - 65F (Fish)") | ok |
| 6'5"DE | `65DE` | https://millenniumfoam.com/65de-hybrid/ ("Blanks - 6'3" to 6'6" long - 65DE (Hybrid)") | ok |
| 6'6"DG | `66DG` | https://millenniumfoam.com/66dg-sb-machine-66ea/ ("Blanks - 6'3" to 6'6" long - 66DG (Shortboard)") | ok |
| 6'8"DG | `68DG` | https://millenniumfoam.com/68dg-sb-machine-69ea/ ("Blanks - 6'8" to 6'11" long - 68DG (Shortboard)") | ok |
| 6'9"A | `69A` | https://millenniumfoam.com/69a-shortboard-2/ ("Blanks - 6'8" to 6'11" long - 69A (Shortboard)") | ok |
| 6'10"M | `610M` | https://millenniumfoam.com/610m-fish/ ("Blanks - 6'8" to 6'11" long - 610M (Fish)") | ok |
| 6'11"M | `611M` | https://millenniumfoam.com/611m-hybrid/ ("Blanks - 6'8" to 6'11" long - 611M (Hybrid)") | ok |
| 6'11"MT | `611MT` | https://millenniumfoam.com/611mt-hybrid/ ("Blanks - 6'8" to 6'11" long - 611MT (Hybrid)") | ok |
| 6'11"F | `611F` | https://millenniumfoam.com/611f-fish-2/ ("Blanks - 6'8" to 6'11" long - 611F (Fish)") | ok |
| 6'11"P | `611P` | — | no page found — not on any size-range listing, the store search, or the 6,519-URL product sitemap |
| 7'1"DG | `71DG` | https://millenniumfoam.com/71dg-shortboard/ ("Blanks - 7'1" to 7'11"" long - 71DG (Shortboard)") | ok |
| 7'3"DG | `73DG` | https://millenniumfoam.com/73dg-sb/ ("Blanks - 7'1" to 7'11"" long - 73DG (Shortboard)") | ok |
| 7'3"F | `73F` | https://millenniumfoam.com/73f-2/ ("Blanks - 7'1" to 7'11"" long - 73F") | ok |
| 7'4"P | `74P` | https://millenniumfoam.com/74p/ ("Blanks - 7'1" to 7'11"" long - 74P") | ok |
| 7'5"HS | `75HS` | https://millenniumfoam.com/75hs-hybrid-series/ ("Blanks - 7'1" to 7'11"" long - 75HS (Hybrid Series)") | ok |
| 7'7"B | `77B` | https://millenniumfoam.com/77f/ ("Blanks - 7'1" to 7'11"" long - 77B") | ok — slug says 77f, title says 77B |
| 7'9"P | `79P` | https://millenniumfoam.com/79p-pt/ ("Blanks - 7'1" to 7'11"" long - 79P (Longboard)") | ok |
| 7'9"PT | `79PT` | https://millenniumfoam.com/79pt-longboard/ ("Blanks - 7'1" to 7'11"" long - 79PT (Longboard)") | ok |
| 7'10"DG | `710DG` | https://millenniumfoam.com/710dg-gun/ ("Blanks - 7'1" to 7'11"" long - 710DG (Gun)") | ok |
| 7'11"CB | `711CB` | https://millenniumfoam.com/711cb-hybrid-machine/ ("Blanks - 7'1" to 7'11"" long - 711CB (Hybrid machine)") | ok |
| 7'11"CT | `711CT` | https://millenniumfoam.com/711cb-2/ ("Blanks - 7'1" to 7'11"" long - 711CT") | ok — slug says 711cb-2, title says 711CT |
| 8'3" | `83` | https://millenniumfoam.com/83-longboard/ ("Blanks - 8'3" to 8'10" long - 83 (Mini Longboard)") | ok |
| 8'4"P | `84P` | https://millenniumfoam.com/84p-pt-lb/ ("Blanks - 8'3" to 8'10" long - 84P (Longboard)") | ok |
| 8'4"PT | `84PT` | https://millenniumfoam.com/84pt/ ("Blanks - 8'3" to 8'10" long - 84PT (:Longboard)") | ok |
| 8'4"CB | `84CB` | https://millenniumfoam.com/84-cb/ ("Blanks - 8'3" to 8'10" long - 84CB (Hybrids/Eggs)") | ok |
| 8'5"B | `85B` | https://millenniumfoam.com/85b-hybrid/ ("Blanks - 8'3" to 8'10" long - 85B (Hybrid)") | ok |
| 8'8"DG | `88DG` | https://millenniumfoam.com/88dg-sb/ ("Blanks - 8'3" to 8'10" long - 88DG (Gun)") | ok |
| 8'10"M | `810M` | https://millenniumfoam.com/810m-mt-lb/ ("Blanks - 8'3" to 8'10" long - 810M (Longboard)") | ok |
| 8'10"MT | `810MT` | https://millenniumfoam.com/810mt/ ("Blanks - 8'3" to 8'10" long - 810MT (Longboard)") | ok |
| 9'3"P | `93P` | https://millenniumfoam.com/93-p-1/ ("Blanks - 9'3" to 9'9" long - 93P (Longboard)") | ok |
| 9'3"G | `93G` | https://millenniumfoam.com/93g-gun/ ("Blanks - 9'3" to 9'9" long - 93G (GUN)") | ok |
| 9'4"M | `94M` | https://millenniumfoam.com/94-m-longboard/ ("Blanks - 9'3" to 9'9" long - 94M (Longboard)") | ok |
| 9'4"MT | `94MT` | https://millenniumfoam.com/94mt/ ("Blanks - 9'3" to 9'9" long - 94MT (Longboard)") | ok |
| 9'5" | `95` | https://millenniumfoam.com/95-longboard/ ("Blanks - 9'3" to 9'9" long - 95 (Longboard)") | ok |
| 9'5"P | `95P` | https://millenniumfoam.com/95p/ ("Blanks - 9'3" to 9'9" long - 95P (Longboard)") | ok |
| 9'7"G | `97G` | https://millenniumfoam.com/97g-gun-that-can-net-97/ ("Blanks - 9'3" to 9'9" long - 97G (Gun)") | ok |
| 9'9"P | `99P` | https://millenniumfoam.com/99p-lb/ ("Blanks - 9'3" to 9'9" long - 99P (Longboard)") | ok (also a stock-config page: https://millenniumfoam.com/99p-blue-mob-3-8-cedar-natural-rocker/) |
| 9'9"Y | `99Y` | https://millenniumfoam.com/99y-lb-98y/ ("Blanks - 9'3" to 9'9" long - 99Y (Longboard)") | ok (also a stock-config page: https://millenniumfoam.com/99y-yellow-2-3-16-cedar-6-from-center-12-apart-1-2nose-rocker-oceanside/) |
| 10'2"P | `102P` | https://millenniumfoam.com/102p-lb/ ("Blanks - 10'2" to 12'2" long - 102P (Longboard)") | ok |
| 10'3"CT | `103CT` | https://millenniumfoam.com/103ct-lb/ ("Blanks - 10'2" to 12'2" long - 103CT (Longboard)") | ok |
| 10'3"G | `103G` | https://millenniumfoam.com/103g-gun-that-can-net-103/ ("Blanks - 10'2" to 12'2" long - 103G (Gun)") | ok |
| 10'7"G | `107G` | https://millenniumfoam.com/107g-gun-nets-107/ ("Blanks - 10'2" to 12'2" long - 107G (Gun)") | ok |
| 11'3"P | `113P` | https://millenniumfoam.com/113p-longboard/ ("Blanks - 10'2" to 12'2" long - 113P (Longboard)") | ok |
| 11'9"P | `119P` | — | no page found — not on any size-range listing, the store search, or the 6,519-URL product sitemap |
| 12'2"P | `122P` | https://millenniumfoam.com/122-p/ ("Blanks - 10'2" to 12'2" long - 122P (Longboard)") | ok |

**Millennium counts:** verified page for **59 of 61**; seed slug wrong: **n/a** (the seed column holds model codes, not slugs — every one needs a page slug added, none derivable); no page: **2** (611P, 119P).

## Totals

- US Blanks: 101/101 have a page; 61 seed slugs correct, 40 wrong (2 of them 200-but-wrong-blank), 0 without a page.
- Marko Foam: 23/28 have a page; seed holds no slugs; 5 without a page.
- Millennium Foam: 59/61 have a page; seed holds codes, not slugs; 2 without a page.
- Arctic Foam: skipped (catalogue PDF only).
