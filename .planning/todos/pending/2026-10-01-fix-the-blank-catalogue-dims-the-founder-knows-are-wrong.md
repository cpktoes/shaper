---
created: 2026-10-01T06:40:00.000Z
title: Fix the blank catalogue dims the founder knows are wrong
area: data
severity: major
files:
  - db/seed/blanks/us_blanks_stations.csv
  - db/seed/blanks/arctic_foam_stations.csv
  - db/seed/blanks/marko_foam_stations.csv
  - scripts/seed-blanks.ts
  - scripts/generate-preset-blanks.ts
  - lib/db/blanks.ts
  - lib/geometry/presets.ts
---

## Problem

Captured from the founder on 2026-10-01, at the close of the Phase 13 build evening, in their words:
"after this we need to fix quite a few blank dims". Some of the blanks in the three catalogues the
ROCKER screen offers (US Blanks, Arctic Foam, Marko Foam — seeded from the vendor catalogues in
Phase 11) carry dimensions the founder knows to be wrong. Which blanks and which numbers is the
founder's list, still to be written down.

## Progress — 2026-10-01 (the founder: "let's tackle the blank errors now")

**The list now exists.** Every number the app holds for the 162 blanks was checked against the
makers' own catalog pages — the three PDFs in the founder's Downloads folder that the catalogue
files were first built from. The method and every finding, each with its catalog page, are in
`.planning/quick/261001-v1q-blank-catalog-corrections-part-1-us-blan/261001-v1q-CORRECTIONS.md`;
the founder has a 7-page sheet of the findings showing the catalog's own printed labels.

**The cause.** Each US Blanks drawing prints every measurement twice — inches, with centimetres
underneath. The catalogue file's US Blanks numbers were taken from the centimetre line, and that
line has slips (often a copy of the neighbouring row). Marko Foam: every number matches its page.
Arctic Foam: 29 of 33 blanks match.

**Done and live — part 1 (quick task 261001-v1q).** Built 2026-10-01; live 2026-10-02 on the
founder's go — pushed (82de081), deployed, and production reseeded by the founder (162 of 162),
then checked on the live site:

- 31 US Blanks station numbers follow the page's inch figure, each with a DATASHEET note;
- the three 9'8" EPS blanks are 9'8" long (they read 9'0"), their nose-side stations moved with it;
- the 6'3"RP — the Shortboard preset's blank — reads 51.5 L (it read 57.5 L);
- the 10'0"T has a rounded nose (it had a 32" square one).

**Done and live — part 2 (quick task 261001-www).** The founder's three decisions of 2026-10-01, by
question card; live 2026-10-02 on the founder's go — pushed (7981cf1), deployed, production reseeded
by the founder (162 of 162), checked on the live site:

- Arctic Foam's four June-2022 pages (10'2" LB, 9'4" G, 9'9" G, 10'6" G) take the page's inch
  figures: 29 numbers, each row's note rewritten to say so. (The card named "the 12-inch stations",
  24 of the 29; the other five are the same pages' remaining cells with the same old note — the
  10'2" LB's width 3" back from the nose, the 9'4" G's two tip rockers, the 9'9" G's center and
  nose-tip thickness — changed with them so no curve mixes the page's two sets of figures; the
  founder was told before the go.)
- Six US Blanks numbers the catalog prints wrong in both units take the sister blank's figure,
  each with a note: 6'2"A N18 → 2 7/16", 6'4"EAX N24 → 2 11/16", 7'2"X EPS T24 → 2 15/16",
  8'4"SPX N18 → 2 15/16", 10'6"AX T36 → 3 9/16" (thickness); 8'0"H T6 → 2 3/8" (rocker).
- The 7'9"HX and 8'4"SPX keep the litres their pages print (the founder's decision).

**Built — part 3 (quick task 261002-aqu, 2026-10-02).** The founder's two decisions of 2026-10-02,
by question card. On this computer and in the development database only — NOT yet pushed, NOT yet
in production:

- The twelve rows where the catalog's inch label is the slip (the app already held the right
  figure) gain a DATASHEET note, e.g. the 9'2"A at center: `width: catalog prints 21 1/4" but
  56.52 cm here; used the cm value (22 1/4")`.
- The blank the catalog's page titles `10'0"T` is listed as the `10'10"T` it is (10'9 3/8" long,
  catalog address `sups/1010T`), with a note saying so.
- The seed can remove a blank that has left the catalogue files — only with `--prune`, never more
  than five in one run, never on an empty catalogue (`lib/blanks/prune.ts`, tested). Proven on the
  development database: a plain reseed added the new name, kept the old row and said so (163
  blanks, exit 1, with the hint); `--prune` removed exactly `US Blanks 10'0"T`; 162 of 162.

**Still open — the founder's calls:**

1. **The go for part 3**: push, let Vercel deploy, then reseed production with the `--prune`
   one-liner in `scripts/seed-blanks.ts`'s header (it must print one `removed (no longer in the
   catalogue): US Blanks 10'0"T` line and end "162 of 162").
2. **The founder's own list** — any blank they know to be wrong that a check against the catalog
   could not see (a number the catalog prints consistently but a real blank contradicts).

Found along the way and left alone: the two catalog addresses that repeat a neighbour's (6'9"EAX,
11'8"BG) are printed that way on the catalog pages themselves; lengths and deck lengths where the
page's inch and cm differ by a quarter inch or less; the rocker the catalog does not print at the
48-inch stations of five long blanks (stored as 0); the Marko stations placed on the 12-inch grid;
the 8'6"EA's litres (about 8% under what its stations suggest) and the 8'8" EPS's tail rocker at
6" (flatter than its neighbours suggest) — both printed consistently, so only a real blank can say.

## Solution

How a correction round runs (part 1 is the worked example):

- Every change names its source — the catalog page and what it prints, or a measured blank — in a
  CORRECTIONS file in the round's quick-task folder, so each number has a source the way the seed
  data does.
- The fix is to the catalogue CSVs under `db/seed/blanks/`, never a hand edit of the database, and
  each changed row gets a note in its `flag` column (the DATASHEET prints it). The files are CRLF.
- Regenerate `lib/blanks/preset-blanks.generated.json` with `scripts/generate-preset-blanks.ts`
  (part 1 changed the Fish's 5'10"RP and the Shortboard's 6'3"RP; part 2 touched no preset blank;
  the four preset cards' litres did not move in either round).
- Reseed the development database, then production after the founder's go. An updated row is not a
  schema change: the seed upserts by vendor + name. A RENAMED or withdrawn blank also needs the
  seed's `--prune` option, or the old row stays behind and the seed's own check fails.
- Saved boards carry their blank's rows by value, so a correction never moves a board already
  saved — only new picks see the corrected rows. (Checked 2026-10-01: the development database
  holds 7 saved boards, one on a blank, the 6'8"RP, which is not a corrected blank.) Phase 11's
  recorded boards are pinned to the blanks they were recorded on
  (`lib/geometry/__fixtures__/phase11-foil-golden-blanks.json`), so later rounds do not disturb
  those tests.
