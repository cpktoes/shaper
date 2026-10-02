# Blank catalog corrections, part 3 — the source list

Quick task 261002-aqu. Parts 1 and 2 (quick 261001-v1q and 261001-www) corrected the numbers. This
round changes no station number. It applies two decisions the founder made on 2026-10-02, by
question card:

1. **"Yes, add the notes"** — on the twelve rows where the catalog's INCH label is the slip and the
   app (which holds the page's centimetre figure) is already right, the row gains a note, so a
   shaper holding the page sees why the app differs from the inch figure printed there.
2. **"Yes, rename it"** — the blank the catalog's page titles `10'0"T` is the `10'10"T`: the page
   gives its length as 10'9 3/8" and its catalog address as `sups/1010T`. The app now lists it as
   `10'10"T`.

How the catalog check was made, and where the catalog pages live, is in part 1's
`.planning/quick/261001-v1q-blank-catalog-corrections-part-1-us-blan/261001-v1q-CORRECTIONS.md`.

## A. Twelve notes (no number changes)

Each of these was read by eye from the catalog drawing. The page prints an inch label and a
centimetre figure that disagree; here the centimetre figure is the right one — the curve through
the neighbouring stations, the sister blank or the page's own headline says so — and the app
already holds it.

| Blank | Page | Station | The note the row gains | How we know the cm figure is right |
|-------|------|---------|------------------------|-------------------------------------|
| 5'9"P | 2 | N6 | `thickness: catalog prints 1 13/16" but 3.02 cm here; used the cm value (1 3/16")` | should read 1 3/16 — it sits between 13/16 and 1 5/8 |
| 6'4"MB | 14 | N18 | `rocker: catalog prints 3/16" but 2.06 cm here; used the cm value (13/16")` | should read 13/16 |
| 6'9"EAX | 25 | N0 | `thickness: catalog prints 13/16" but 3.02 cm here; used the cm value (1 3/16")` | should read 1 3/16 — the 6'9"EA plus 1/4 |
| 7'11"A | 45 | N6 | `rocker: catalog prints 4 13/16" but 10.64 cm here; used the cm value (4 3/16")` | should read 4 3/16 — curve gives 4.28 |
| 8'2"A | 48 | N18 | `width: catalog prints 20 1/4" but 52.07 cm here; used the cm value (20 1/2")` | should read 20 1/2 — curve gives 20.53 |
| 8'2"AX | 49 | N18 | `width: catalog prints 20 1/4" but 52.07 cm here; used the cm value (20 1/2")` | same outline as the 8'2"A |
| 8'9"Y | 55 | N48 | `width: catalog prints 25 13/16" but 63.02 cm here; used the cm value (24 13/16")` | should read 24 13/16 — the page's own max width |
| 9'2"A | 57 | C | `width: catalog prints 21 1/4" but 56.52 cm here; used the cm value (22 1/4")` | should read 22 1/4 — the page's own max width |
| 9'9"B | 66 | N48 | `width: catalog prints 24 13/16" but 63.34 cm here; used the cm value (24 15/16")` | should read 24 15/16 — the page's own max width |
| 9'8"X EPS | 92 | T24 | `thickness: catalog prints 3 3/16" but 7.46 cm here; used the cm value (2 15/16")` | a copy of the next row's label; 9'8" EPS plus 3/8 is 2 15/16 |
| 11'8"BG | 78 | T36 | `width: catalog prints 23" but 58.92 cm here; used the cm value (23 3/16")` | should read 23 3/16 — curve gives 23.21 |
| 10'4"B SUP EPS | 100 | N36 | `rocker: catalog prints 5/16" but 1.59 cm here; used the cm value (5/8")` | should read 5/8 — matches the tail side's 11/16 |

Two of the twelve rows already carry a note (the 8'9"Y at N48, the 10'4"B SUP EPS at N36); the new
note is added after it, joined with "; " as the file does everywhere else.

## B. The rename

| What | Was | Now |
|------|-----|-----|
| the blank's name on its 15 rows of `db/seed/blanks/us_blanks_stations.csv` | `10'0"T` | `10'10"T` |
| the note on its tail-tip row (T0) | none | `name: the catalog page titles this blank 10'0"T; its catalog address (sups/1010T) and its length (10'9 3/8") are the 10'10"T's, the name used here` |

Its catalog address (`sups/1010T`), page (76) and every number stay as they are.

**What a rename needs beyond the file.** The blank list in the database is keyed by maker + name,
and the seed only ever adds or updates rows. After the rename it would add a `10'10"T` row and leave
the old `10'0"T` row behind (163 blanks, and the seed's own check would fail). So this round also
teaches the seed to remove a blank that is no longer in the catalogue files — only when asked to,
with a new `--prune` option; without it the seed behaves exactly as before and can never remove
anything. A saved board is not affected either way: it carries its own copy of its blank.

## Not changed

- Every station number, length, litres figure and catalog address. (The two catalog addresses that
  repeat a neighbour's — 6'9"EAX and 11'8"BG — turn out to be printed that way on the catalog pages
  themselves, so the file is a faithful copy; they stay.)
- The Arctic Foam and Marko Foam files.

## The machine-readable copy

`261002-aqu-corrections.json` holds exactly the changes above (for each row: the old note and the
new note; and the rename). `261002-aqu-apply-corrections.py`, run from the repository root with the
JSON's path, applies them and refuses to write unless every old note is found as listed and exactly
15 rows carry the old name. Dry run on a copy: 27 lines change in the US Blanks file (12 notes + 15
renamed rows, one of which also gains the name note), CRLF kept; the four presets' blanks do not
change; the whole unit suite (3,614 tests) passes on the changed copy with no test edited.
