---
quick_id: 261114-vwo
title: Open the blank's own catalog page from the picked blank's card and the DATASHEET
date: 2026-11-14
status: complete — development migrated and seeded; production awaits the founder (steps below)
commits: [a040f601 (code, seed data, migration), docs commit after it]
---

# Open the blank's own catalog page from the picked blank's card and the DATASHEET — summary

## What changed, in plain words

A shaper looking at the blank they picked can now open the maker's own page for it, in a new tab, from two places
and no others — the founder's ruling of 2026-11-14:

- **On ROCKER's BLANK card**, a small CATALOG PAGE link stands on the line under Change Blank, flush with it, in the
  same call-to-action ink. (The ruling said "beside": side by side the two did not fit on a computer's sidebar card —
  they ran into each other — so the link took the line below; the founder can say if he wants it elsewhere.)
  Tapping the rest of the card still opens the Pick a Blank popup exactly as before.
- **On the DATASHEET**, the footnote's "From the US Blanks catalog, page 12" keeps its words, and "page 12" is now
  the link.

Where it goes depends on the maker: US Blanks' catalogue page for that blank, Marko Foam's or Millennium Foam's
store page for it, or Arctic Foam's 2024 catalogue PDF opened at the blank's own page. Where a maker has no page
for a blank — five Marko Foam blanks (10'2" M, 10'2" M Thick, 9'6" MK, 8'0" Gun, 10'6" Gun) and two Millennium
Foam blanks (6'11"P and 11'9"P) — nothing is drawn and the footnote prints the page number plain, as it always did.
A wrong page is worse than none. The Pick a Blank list rows carry no link (the ruling).

A board saved before today carries a copy of its blank with no address on it. For such a board the card and the
sheet look the address up in the loaded catalogue by maker and name, so the founder's saved boards get the link
without being re-saved or re-picked. Nothing about any saved board's numbers changes.

## How the addresses were found

Every address comes from the audit of 2026-11-14 (`.planning/research/blank-link-audit-2026-11-14.md`), where each
maker's site was fetched and each page's title matched to the blank — not from the seed's old `catalog_slug`
column, 40 of whose 101 US Blanks slugs were wrong and two of which answered for a different blank (6'9"EAX showed
the 6'9"EA page; 11'8"BG showed the 10'8"BG page). That column stays untouched: it records which catalogue page the
rows were transcribed from, and is provenance, not the link.

Arctic Foam was the audit's open question (a PDF, no page per blank). This task settled it: the 2024 catalogue PDF
(33 pages) was read with pypdf, and the seed's `pdf_page` IS that catalogue's page — one blank per page, 29 matched
by the name printed on the page and the four whose names are pictures (5'8" SB, 6'0" SB, 6'8" SBF, 6'8" SBM) matched
by their printed station widths against the seed's. So every Arctic link carries `#page=N`.

## What was built

- **Seed files** (`db/seed/blanks/*.csv`): a `catalog_url` column after `pdf_page`, written in full by a one-off
  script that matched every blank to the audit's tables by maker and name and refused on any it could not place.
  US Blanks 101 of 101, Arctic Foam 33 of 33, Marko Foam 23 of 28, Millennium Foam 59 of 61.
- **Reader and types**: `lib/blanks/catalog.ts` maps the cell to `catalogUrl` (empty → null; a non-empty cell must
  be an https address of at most 200 characters); `BlankRecord.catalogUrl?: string | null` (absent on an old copy);
  the saved-board shape schema names it so zod keeps it on every load; `lib/blanks/preset-blanks.generated.json`
  regenerated so the four preset blanks carry theirs.
- **Database**: `blanks.catalog_url text` nullable (migration `drizzle/0013_blank_catalog_url.sql`), the row ↔
  record mapping, the row check and the seed's upsert and read all carry it.
- **The rule** (`lib/blanks/catalog-link.ts`): one fixed table of the four makers' addresses; `blankCatalogLink`
  returns a link only when the maker is known, the stored address starts with that maker's address and holds only
  plain address characters (no `?`, `&`, quotes or brackets), so a board file's copy can never put an address of its
  own choosing on the screen; `catalogUrlFromCatalogue` answers an old copy from the loaded catalogue.
- **The screen** (`components/rocker/blank-catalog-link.tsx`): the link in two looks, new tab,
  `rel="noopener noreferrer"`, an external-link icon, a 44-dot touch box on a coarse pointer (the card's by its
  height; the sheet's by a `::after` box that widens the tap area without moving the line). The BLANK button now
  stands in a relative wrapper with the link as its sibling — a link inside a button is not valid HTML and would open
  the popup too — and keeps an invisible line of the same words for the link to stand on, shown only while the link
  exists (`group-has`), so a blank with no maker's page leaves no empty line. The DATASHEET receives the catalogue
  promise for the old-copy lookup.

## Proof

- **Unit:** `lib/blanks/catalog-link.test.ts` (16 tests: the rule, its refusals, and the seed — every address passes,
  the audit's tables matched address for address, the seven blanks with no page named, Arctic's anchors equal
  `pdf_page`, no two blanks share a page, the two formerly wrong-blank addresses corrected); the catalogue, database
  and preset-blank suites updated for the new field. `npm test`: 13,768 passed, 11 timed out — the machine carried a
  load average of 100–215 from the sibling sessions and vitest's 5-second limit fired on heavy tests in eight files
  (none a wrong answer); those eight files re-run with a long per-test limit once the load fell: 2,130 of 2,130 pass.
  `tsc` and lint clean.
- **Browser:** `e2e/blank-catalog-link.spec.ts`, four tests on the iPhone, the Pixel 7 and the computer: the card's
  link points at the picked maker's own site, opens a stubbed new tab at that address, stands under Change Blank and
  flush with it, is 44 dots tall on a phone, and the card still opens the popup; the DATASHEET footnote's "page N" is
  the same link, and a tap 10 dots above its words reaches it on a phone; Marko Foam's 10'2" M draws no link on the
  card or the sheet and the footnote still names the page; with the blank removed there is no link anywhere. Green
  on all three devices (the iPhone profile flaked twice under the same load inside the picker helper — the popup slow
  to close, the picked card's text not yet painted — and passed 4 of 4 re-run alone).
- **Baseline:** the desktop ROCKER picture is unchanged (a fresh page has no blank picked, so nothing new is drawn).
- **Pictures** (`pictures/`): the BLANK card with the link on the computer, the iPhone and the Pixel 7; the card for
  a blank with no maker's page (no link, no empty line); the DATASHEET footnote on the computer and the iPhone.

## Production — the founder's steps, in this order

Nothing here touched production. The change is additive (a nullable column and new data), so CLAUDE.md's rule
applies: **migrate production first, then seed, then deploy.** The old code never names `catalog_url`, so it keeps
working throughout; the new code finds the column and the addresses in place the moment it deploys.

From this branch's checkout, with the Vercel CLI signed in:

1. **Migrate production** (adds the empty column):

   ```bash
   npm run db:migrate:prod
   ```

2. **Seed production** (fills the column for all 223 blanks; `--prune` is not needed — no blank was renamed or
   withdrawn — and `--check` proves every stored blank reads back exactly as its CSV rows):

   ```bash
   bash -c 'trap "rm -f .env.production.pull" EXIT; npx vercel env pull --yes --environment=production .env.production.pull && SEED_ENV_FILE=.env.production.pull npx --no-install tsx scripts/seed-blanks.ts && SEED_ENV_FILE=.env.production.pull npx --no-install tsx scripts/seed-blanks.ts --check'
   ```

   Expected: `blanks: 223 (US Blanks 101, Arctic Foam 33, Marko Foam 28, Millennium Foam 61); pickable: 219` and
   `matching the catalogue CSVs exactly: 223 of 223`.

3. **Merge and push** this branch to `main`; Vercel deploys. Until step 2 has run, the deployed new code would
   draw no links (every address null) — nothing breaks either way.

Development was migrated and re-seeded in this task (the worktree pulled its own development env with
`vercel env pull`): `npm run db:generate`, `npm run db:migrate`, the seed with `--prune` (nothing to remove) and
`--check` — 223 of 223 matching.

## Limits and leftovers

- The links point at the makers' sites as they stand on 2026-11-14. A maker renaming a page, or Arctic Foam
  publishing a 2025 catalogue under a new file name, breaks that link until the seed is re-audited; nothing in the
  app can tell.
- Arctic Foam's `#page=` anchor relies on the browser's PDF viewer honouring it (Chrome, Safari and Firefox do).
- The seed's `catalog_slug` column is still the transcription's provenance with its known wrong slugs; correcting
  it is a separate, cosmetic data task — no screen reads it.
- Marko Foam's `70-sup` (7'0" SUP) is on the maker's site but not in the catalogue (the audit); adding it is a
  catalogue task, not a link one.
