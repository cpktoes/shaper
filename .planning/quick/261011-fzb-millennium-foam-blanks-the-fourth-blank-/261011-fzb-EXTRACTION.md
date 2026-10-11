# Millennium Foam catalogue — how the numbers were read (2026-10-11)

**Source:** `MILL FULL CATALOG 2024 VR 9.27_opt.pdf` — Millennium Foam's "POLY & EPS BLANK CATALOG 2024", 76 pages,
on the founder's Mac in `~/Downloads` (not in the repo, like the other three makers' catalogs). Pages 14–74 are the
blank pages, one blank each: 61 blanks, from the 5'0"WS wake-surf blank to the 12'2"P glider. `pdf_page` in the CSV is
the page in this PDF.

**What a page prints.** A top view of the blank with the full width at 12" and 24" from each tip and at the centre
(labelled `0"` or `M`), plus the nose-tip and tail-tip widths; a side view with the rocker (left column) and the
thickness (right column) at the same seven stations — nose tip, 12" and 24" from the nose, centre, 24" and 12" from
the tail, tail tip; and a headline with Bottom Length, Tip To Tip Deck (or Length), Max Width, Max Thickness (not on
every page) and Volume in litres. Every number carries an inch fraction with a centimetre line under it.

**How it was read.** The labels are real PDF text, not an image, so pypdf's layout-mode engine gave every label with
its position; rows were grouped by height on the page and columns by their x, and each inch label was paired with the
centimetre line printed under it. The stations are `T0`, `T12`, `T24`, `C` (at half the bottom length, as in the
other catalogues), `N24`, `N12`, `N0`. The 10'3"G also prints widths at 48" from each tip (`T48`/`N48`, width only).
The 5'0"WS and 5'2"WS draw only the 12" and centre stations on their outline (no 24" widths) while their side views
carry all seven rows. `deck_length_in` is the Tip To Tip figure; `length_in` the Bottom Length.

**Every cell was checked.** 1,281 cells in all: 1,189 agree between the inch label and the centimetre line; the 92
that disagree, or have no centimetre line, were read by eye from crops (`cells_all.png` in the archive) and every one
reads as parsed. The inch label is the figure used throughout, as it is for US Blanks, because the catalog's
centimetre lines are copied from neighbouring rows on several pages (the two WS pages print 5.08 cm under four
different thicknesses; the 6'2"F's centimetre widths belong to some other blank). Three exceptions, where the inch
label is a misprint and the centimetre line gives the intended figure:

- 6'1"A, N12 thickness: prints 2 13/16" but 5.55 cm (2 3/16"), which fits N0 15/16" and N24 2 13/16" — used 2 3/16".
- 8'4"P, T24 thickness: prints "3 1/6"" (no such fraction) and 7.77 cm — used 3 1/16".
- 9'9"P, T0 thickness: prints "1 1/3"" (no such fraction) and 3.81 cm — used 1 1/2".

Every cell whose centimetre line disagrees with its inch label by a sixteenth or more carries a flag in the CSV's
`flag` column in the catalogue's usual words ("… catalog prints X but Y cm here; used the inch value"); 100 flags in
all, shown as footnotes on ROCKER's DATASHEET like the other makers' flags.

**Nose tips.** 24 pages print no nose-tip width. 21 are rounded noses: width 0 with the catalogue's usual flag
("width 0: rounded nose, not printed in catalog"). Three come to a point — the 6'3"S fish and the 9'7"G and 10'7"G
guns — and take a width of 1" (the founder's rule, 2026-10-11: "If the nose is pointed, use 1" as n0. So we keep our
0 = round logic"), flagged as such.

**Headline against station.** Five pages' Max Width or Max Thickness line disagrees with the centre station (6'1"A,
7'3"DG, 8'4"CB, 9'3"G, 9'9"Y); the station figure is used and the disagreement noted on the `C` row. The 7'9"P and
7'9"PT print a tip-to-tip deck (7'9 3/8") longer than their bottom length (7'9"); both kept as printed, noted on `T0`.

**Sister blanks.** The 7'9"P/PT and 8'4"P/PT pairs share outline and rocker exactly and differ in thickness only, as
the "T" (thick) naming says; the 9'4"M/MT pair likewise. The 6'11"M/MT, 8'10"M/MT and 7'11"CB/CT pairs differ in a few
rocker figures as printed. The 9'4"M's T12 thickness (2 7/8") is thicker than the thicker 9'4"MT's (2 9/16") — both
units agree on each page, so both are kept, with a note.

**Names and codes.** Names as the catalog's headlines spell them: `6'1"DG`, `5'0"WS`, `8'3"`, `12'2"P` (straight
quotes, no spaces — the 6'2"F's headline is drawn rather than typed, and was read from the page). `catalog_slug` is
the catalog's own short code for the blank, the one its text uses ("The 61DG …"): `61DG`, `50WS`, `83`, `122P`.

**Checked through the app's own reader** (`lib/blanks/csv.ts` → `rowsToBlankRecords` → `isPickable`,
`isWellFormedBlankRecord`, `prepareBlank`): 61 records, 61 pickable, 61 well formed, 61 prepared without error;
stations run strictly tail to nose on every blank, including the WS pair (T24 24" < C 30 5/8" < N24 37 1/4") and the
10'3"G (T48 48" < C 62 5/16" < N48 76 5/8").

**Archive.** `261011-fzb-extraction-tools.tar.gz` holds the extraction scripts (pypdf fragments → parsed rows → CSV),
`blanks.json` (every cell with its inch text, centimetre line and page position), the full station table, and the
three crop sheets used for the eye checks. The scripts are scratch tools, archived rather than committed loose so
nothing under `.planning` is read by tsc or lint.
