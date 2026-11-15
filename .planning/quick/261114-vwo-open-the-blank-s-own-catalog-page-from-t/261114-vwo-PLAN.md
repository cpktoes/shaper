---
quick_id: 261114-vwo
title: Open the blank's own catalog page from the picked blank's card and the DATASHEET
date: 2026-11-14
source: to-do 2026-09-26-open-the-blank-s-catalog-page-from-the-app.md; the founder, 2026-11-14: "Picked blank's card + DATASHEET"; the audit .planning/research/blank-link-audit-2026-11-14.md
planned_by: the orchestrator inline (no planner or executor spawned)
---

# Open the blank's own catalog page from the picked blank's card and the DATASHEET

## Goal

A shaper looking at the blank they picked can open the maker's own page for it, in a new tab, from two places and
no others: the BLANK button's card on ROCKER (a small Catalog Page link beside Change Blank) and the DATASHEET's
blank footnote, where "page 12" becomes the link. Not on the Pick a Blank list rows (the founder, 2026-11-14).
Where a maker has no page for a blank, nothing is drawn — a wrong page is worse than none.

## What the audit settled (2026-11-14)

- US Blanks: a page per blank, 101 of 101, at `https://usblanks.com/catalog/<series>/<slug>/`; 40 of the seed's
  provenance slugs were wrong and two answered 200 for a different blank.
- Marko Foam: a Shopify product page for 23 of 28 (no page for 10'2" M, 10'2" M Thick, 9'6" MK, 8'0" Gun, 10'6" Gun).
- Millennium Foam: a store page for 59 of 61 (none for 611P and 119P); slugs irregular, none derivable.
- Arctic Foam: one catalogue PDF, `https://arcticfoam.us/s/2024Catalog.pdf`, 33 pages. Checked in this task with
  pypdf: the seed's `pdf_page` IS the 2024 catalogue's page, one blank per page, all 33 matched by name or by the
  station widths — so every Arctic link carries `#page=N`.

## Tasks

1. **Data.** A new `catalog_url` column in the four seed CSVs (after `pdf_page`, before `flag`), written out in full
   from the audit's verified-page tables by a one-off script that matches each blank by maker and name and refuses
   on any blank it cannot place; empty where no page exists. The reader (`lib/blanks/catalog.ts`) maps it to
   `catalogUrl: string | null` (empty cell → null, a non-empty cell must be an `https://` address). `BlankRecord`
   gains `catalogUrl?: string | null` (absent on a board saved before today). The `blanks` table gains a nullable
   `catalog_url` text column (migration 0013), the row ↔ record mapping, the row check and the seed's upsert carry
   it, the preset blanks file is regenerated, and the saved-board shape schema accepts it (zod would otherwise strip
   it on every load).
2. **Rule.** `lib/blanks/catalog-link.ts`: one fixed table of the four makers' addresses, and `blankCatalogLink`
   turns a record into `{ href, label }` only when its maker is known, its stored address starts with that maker's
   address and holds only plain address characters — otherwise null. `catalogUrlFromCatalogue` finds the address for
   a board's copy saved before the column existed (same maker, same name, in the loaded catalogue). Unit tests,
   including one over the seed: every stored address passes the rule, Arctic's page anchors equal `pdf_page`, and
   the counts per maker are the audit's (101, 33, 23, 59).
3. **Screen.** `components/rocker/blank-catalog-link.tsx` draws the link (new tab, `rel="noopener noreferrer"`,
   an external-link icon, a 44-dot touch box on a coarse pointer) and, for an old copy, looks the address up in the
   streamed catalogue inside its own Suspense (nothing drawn until it arrives). The BLANK button becomes a sibling of
   the link in a relative wrapper — a link inside a button is not valid HTML and would also open the popup — with the
   link laid at the card's bottom-right beside Change Blank. The DATASHEET footnote's "page N" becomes the link.
4. **Prove it.** `e2e/blank-catalog-link.spec.ts` on the iPhone, the Pixel 7 and the computer: pick a blank, the
   card's link and the DATASHEET's link both point at the picked maker's address, open in a new tab (the makers'
   sites stubbed, never fetched), the touch box is 44 dots on a phone; a blank with no page draws no link; no blank,
   no link. `npm test` green; lint and `tsc` clean.
5. **Development database.** `npm run db:generate`, `npm run db:migrate`, the seed with `--prune` and `--check`.
   Production is the founder's: migration → seed → deploy, spelled out in the SUMMARY.
