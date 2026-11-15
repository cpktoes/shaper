---
created: 2026-09-27T01:21:27Z
title: Open the blank's own catalog page from the app
area: rocker
severity: minor
files: [components/rocker/blank-picker.tsx, components/rocker/rocker-datasheet.tsx, components/rocker/blank-flag.tsx, lib/geometry/blank.ts, lib/blanks/catalog.ts, db/seed/blanks/us_blanks_stations.csv, db/seed/blanks/arctic_foam_stations.csv, db/seed/blanks/marko_foam_stations.csv]
---

## Problem

Captured 2026-09-26, right after Phase 12 was planned. The founder: "Capture a todo to open actual blank
catalogs pages when looking at a blank."

When a shaper is looking at a blank — a row in the list, the picked blank's card, the DATASHEET's
BLANK block — there is no way to open the manufacturer's own catalog page for it. The data to do so
is already there: every blank carries a `catalogSlug` (for example `wake-surf/5-0-W`) and a
`pdfPage` (`lib/geometry/blank.ts:37-39`, seeded from the `catalog_slug` and `pdf_page` columns of
the three CSVs), and the DATASHEET already prints "From the US Blanks catalog, page 12" as plain
text (`rocker-datasheet.tsx:294`). What is missing is the link itself and the address it points at.

## Solution

Rough shape, for a quick task once the address scheme per vendor is known:

- Find out, per vendor, what a catalog slug and page actually open on the web — US Blanks, Arctic
  Foam and Marko Foam each publish their catalogs differently (a page per blank, or one PDF with page
  numbers). The slug format in the CSVs was chosen with that in mind; confirm it against each vendor's
  live site before building anything, and record the three base addresses in one place in
  `lib/blanks/` (never in a component).
- Put the link where a shaper is already looking at the blank: the picked blank's card (beside
  "Change Blank"), the DATASHEET's BLANK footnote (make "page 12" the link), and perhaps each list
  row's meta line. It opens in a new tab and says where it goes ("US Blanks catalog, page 12").
- Vendor and slug are catalog text, so they render as React text and go into an `href` only after
  the base address is chosen from a fixed table (never a URL built from free text — Phase 11's
  T-11-21/T-11-27 rule).
- If a vendor's catalog cannot be deep-linked to a page, link to the catalog's front and keep the
  page number in the words.
- Touch sizes and the phone layout follow CLAUDE.md's switches as for every control.

## Ruled (2026-11-14)

The founder's pick: a small link on the picked blank's card beside Change Blank, and the DATASHEET's blank-line page number made a link. Not on the list rows. Opens the maker's page in a new tab; a maker with no page per blank opens the catalogue's front.

## Found (2026-11-14, read-only web research)

- **US Blanks** has a page per blank: `https://usblanks.com/catalog/<slug lowercased>/` — the app's `wake-surf/5-0-W`
  maps straight onto `https://usblanks.com/catalog/wake-surf/5-0-w/` (200). But the site's slugs are hand-made (`510rp`,
  `93y`, `5-0-w`, `5-9-p`, `5-11-yu-2`), so every seeded slug must be checked against the series listings; 6'3"RP has no
  page under any likely slug and is absent from the shortboard and wake-surf listings. Whole catalogue PDF: 27.9 MB.
- **Arctic Foam** (`arcticfoam.us`; `.com` is parked): no page per blank; one catalogue PDF at
  `https://arcticfoam.us/s/2024Catalog.pdf` (302 to Squarespace, 33 pages, 9.1 MB) — `#page=N` should hold; family
  pages such as `https://arcticfoam.us/rocker` list the SB blanks with no anchors.
- **Marko Foam** (`markofoamblanks.com`, Shopify): a product page per blank, `…/products/<handle>` — the app's slug
  `molded` is not a handle (`wakesurf-regular` is). Catalogue PDFs: 2026 (48 pages, 8.2 MB), 2023, 2017; which edition's
  page 19 the seed's `pdf_page` means is unknown.
- **Millennium** (`millenniumfoam.com`, BigCommerce): a store page per model, slugs irregular (`/53ws/` is the 50WS;
  `customized-50ws` works for that blank only). No PDF.
- No login walls; all PDFs serve inline.

So the quick task needs a per-maker link rule in `lib/blanks/` AND a slug audit of the seed CSVs (US Blanks and Marko
especially) before any link is shown — a wrong page is worse than none. Sized as a quick task with data work, not a fast one.

## Audited (2026-11-14) — see `.planning/research/blank-link-audit-2026-11-14.md`

Every seeded blank checked against the makers' live sites (each URL fetched, its title matched to the blank):

- **US Blanks — 101 of 101 have a page.** 61 seed slugs are right, 40 wrong (wrong series folder such as `fish-egss`,
  hyphenation the site does not use, two WordPress `-2` suffixes, the Superfused EPS slugs missing/holding `eps`), and
  two are the dangerous kind — a 200 for the wrong blank (`6'9"EAX` → the 6'9" EA page; `11'8"BG` → the 10'8" BG page).
- **Marko Foam — 23 of 28 have a page; 5 none** (10'2" M, 10'2" M Thick, 9'6" MK, 8'0" Gun, 10'6" Gun). The seed's
  `catalog_slug` holds section labels (`molded`, `block-cut`, `sup`), not handles: all need a Shopify handle.
- **Millennium — 59 of 61 have a page; 2 none** (611P, 119P). Slugs irregular (`/53ws/` is the 50WS): all need a slug.
- **Arctic Foam** — the catalogue PDF with `#page=`, no page per blank.

So this task is: a `catalog_url` (or corrected slug) per blank in the seed CSVs from the audit's tables, a per-maker link
rule in `lib/blanks/`, the seed re-applied to both databases (an additive data change — production first, with the
founder present, as every seed run has been), and only then the links on the picked blank's card and the DATASHEET.


## Done (2026-11-14, quick 261114-vwo)

Built to the founder's ruling. Every blank in the four seed files now carries `catalog_url`, written out in full from
the audit's verified pages (US Blanks 101 of 101, Marko Foam 23 of 28, Millennium Foam 59 of 61; Arctic Foam's 2024
catalogue PDF at the blank's own page, all 33 pages checked against the seed with pypdf). `lib/blanks/catalog-link.ts`
is the one rule that turns the stored address into a link — only when it starts with that maker's known address — and
`components/rocker/blank-catalog-link.tsx` draws it in the two ruled places: a CATALOG PAGE action beside Change Blank
on the BLANK button's card, and the DATASHEET footnote's "page N". A board saved before the column existed looks its
address up in the loaded catalogue by maker and name. The old `catalog_slug` column stays as it was — it is the
transcription's provenance, not the link. Development migrated (0013) and re-seeded; production is the founder's:
migrate → seed → deploy, in the task's SUMMARY.
