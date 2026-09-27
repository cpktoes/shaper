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
