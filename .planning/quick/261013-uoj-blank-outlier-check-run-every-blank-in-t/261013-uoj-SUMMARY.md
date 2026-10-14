---
phase: quick-261013-uoj
plan: 01
status: complete
completed: 2026-10-13
commit: 8150aa8
---

# Quick task 261013-uoj — Blank outlier check: find, don't fix

**In a shaper's words:** a check that runs every blank the app holds — all 223, from all four makers — through
the very curve ROCKER draws, taking each station out in turn and asking what the rest of the blank implies there.
The stations that sit well off that curve are tabled and drawn on a page in the dev window
(`http://localhost:<port>/__dev/blank-outliers.html`, written by the script, never shipped). Nothing in the data
was changed.

**How it judges** (`lib/blanks/outliers.ts`, tested):
- *Off its own curve*: leave-one-out on the live rule (`prepareRootCurve`, zero width tips rounded) for every
  interior station that is not the curve's anchor (tips and the thickest/widest/lowest station cannot be asked).
  Scored with a robust z against the SAME station on the maker's other blanks, so a blunt longboard nose reading
  wide at N6 on every such blank is normal and only the unusual one stands out; a floor of 1/16" (rocker,
  thickness) or 1/8" (width) under every flag. Echoes — a bad station throws its neighbours' readings off too —
  are resolved per curve by keeping the furthest-off station and re-reading the rest without it.
- *Confidence*: `high` when both neighbouring stations are within 6" (US Blanks' 6" stations pin the curve, so a
  station off it is most likely a slip in the figure); `low` with 12"-or-more stations, where the rule drawn without
  a station can miss a real nose kick by as much as a misprint would — those are questions, not answers.
- *Unusual for the maker*: each station's share of its centre (or tip, for rocker) against the maker's norm for
  that station — the weaker signal, reaching tips and centres, but flagging honest design as well.

**What it found (2026-10-13):** 139 stations off their own curve, 21 of them between 6" stations (all US Blanks),
plus 63 unusual-for-the-maker readings. The 21 to look at first include the 6'5"R's tail 6"/12" rocker zigzag
(1 7/16" then 11/16" where the curve says 1 5/32" and 15/16"), the 6'8" EPS pair's tail 18" width (17 3/16" vs
17 31/32"), the 7'2" EPS pair's tail 6"/12"/18" thickness, the 5'0"W's nose 12" thickness, and the 9'3"Y's nose 6"
width (a blunt noserider, probably design). The low-confidence list is led by the Marko guns' 24"/36" rockers and
the Marko 10'2" M pair's tail 24" rocker (5/8" against a curve at 1 13/16").

**Files:** `lib/blanks/outliers.ts` (+ test, 10 cases incl. a bumped synthetic blank and the whole catalogue),
`scripts/find-blank-outliers.ts` (`npx --no-install tsx --tsconfig ./tsconfig.json scripts/find-blank-outliers.ts`,
`--out`, `--z`), `.gitignore` (`/public/__dev/`). Unit suite 135 files green, tsc and lint clean; the browser
suite was not run — no app file or browser test changed.

**Executed inline** by the orchestrator under this quick id.

**Follow-up (2026-10-14, the founder: "I don't want this to change the app. Just visual. … I just want to see the
blank we've created from the dims"):** each named blank on the page is now drawn first as the app builds it from the
dims — the side view (the levelled bottom rocker and the deck as bottom plus thickness) and the outline from above
(half the width either side of the stringer, rounded tips as on ROCKER), 1:1 from `prepareBlank`'s own curves, every
printed station ticked and the flagged ones in red — above the three attribute plots. The drawings scale to the
window. Script only; nothing in the app changed and no link to the site was added.

**First corrections from the page (the founder, 2026-10-14):** Arctic Foam's three fish blanks — 6'2" F, 6'8" F and
7'2" F — print 1/16" at both tips, so the app drew a pointed tail where the catalog's drawing shows a square tail about
a foot wide, and a pointed nose. On the founder's word ("make all T0 = 13 1/16 … and they should all have a rounder
nose") each tail tip is now 13 1/16" and each nose tip 0 (the app's round-nose rule), both flagged with the reason;
nothing else moved. The round-nose golden gained the three (67 blanks); the presets' file is unchanged; the whole unit
suite is green; the ROCKER reference picture was re-recorded, its only change the blank list's lower rows (the 6'2" F
now fits the default board). A gallery page, `public/__dev/blank-gallery.html`, now draws every blank in the catalogue
the same way as the outlier page, maker by maker, for looking over by eye.

**Drawings with figures (the founder, 2026-10-14: "I need to see dimensions better … put the dots and the recommended
changes on the blank drawings also … nose to the left tail to right"):** both pages now draw every blank nose-left;
every printed station is a dot with its figure on the drawing itself (thickness above the deck, rocker under the
bottom, width on the upper rail, neighbours staggered so 6" stations never overprint), and a station named on the
outlier page is red with a hollow dot and "→ figure" for what the rest of the blank implies. The side view is drawn
2× taller than life so the figures read (said on the drawing); the outline stays 1:1. Script only.

**Notes for each maker (the founder, 2026-10-14: "downloads that I can send to each blank mfg … where cm/inches
don't match and where values appear to be off … flag all T0 and N0 that are < 1""):** `scripts/make-catalog-reports.ts`
writes one report per maker to `public/__dev/reports/` (HTML and, through the browser tests' own Chromium, a Letter
landscape PDF): A. inches and centimetres that disagree (from the catalogue files' own notes), B. figures off the curve
of the blank's other stations (the outlier check, by confidence, plus the maker-norm readings and the misprint notes),
C. tip widths under an inch (and the tips not printed), D. headline lines against their stations, E. figures not printed
or unreadable, F. every blank mentioned drawn with its figures. Written to the maker in plain terms, with their page
numbers. The drawing and page helpers moved to `scripts/blank-report-shared.ts`, shared with the outlier script.
Dev tooling only; nothing in the app changed. Sizes on 2026-10-14: US Blanks 91 pages, Millennium 55, Arctic 29,
Marko 26.

**Later the same day:** the maker reports are now one block per blank (drawings with the notes under them, a hollow
diamond and "cm says …" where the page's centimetre figure disagrees), every figure three ways — nearest 1/16",
decimal inches, decimal centimetres — on the founder's ask. And the Marko 10'2" M and 10'2" M Thick had their nose
and tail figures swapped at every station (the founder: that page draws the nose on the right, and the first read
took it the other way); each row says so. Goldens unchanged, unit suite green, ROCKER list and picture specs green,
both databases reseeded.

**Review controls (the founder, 2026-10-14: "add check boxes and a text box on the dev page … after I go through the
blanks, I can then submit my changes for you to make … keep a copy of the current database"):** the revert point is
`db/seed/blanks/snapshots/2026-10-14-before-review/` (a dated copy of the four files, with a README) and the tags
`blanks-2026-10-13-before-fixes` and `blanks-2026-10-14-before-review`. The outlier page now lists, under every blank
with any note (the catalogue files' own notes as well as the outlier check's — the same `blankItems` the maker reports
use, from `scripts/blank-report-shared.ts`), one control per note: an "apply" tick, a figure box pre-filled with the
suggestion, a "why" box; plus an "anything else on this blank" line for a station nothing names. Ticks and figures are
remembered in the browser (`localStorage`, key `shaper-blank-review`); a sticky bar counts them; Submit writes the
decisions as JSON into a box on the page and enables a download of `blank-review-decisions.json`.
`scripts/apply-blank-decisions.ts <file> [--write]` then makes exactly those changes to the catalogue files — rehearsal
by default, all-or-nothing, refusing a decision whose "current" figure no longer matches the file — with a note on each
row ("rocker: changed from X to Y on <date> by the founder (why)"), after which the usual gates and reseeds run.

**The founder's first review applied (2026-10-14, `261013-uoj-review-decisions-2026-10-14.json` in this folder):**
53 decisions; 52 changes written across US Blanks, Arctic Foam and Millennium Foam (each row notes what changed, from
what, when and the founder's reason); one was a no-change tick (6'2"A nose 18" thickness ticked with its own figure
and the comment "wrong") and is skipped with a notice — `apply-blank-decisions.ts` now treats such a tick as "left as
is" rather than refusing the batch. One decision was put back after the gates: the 6'4"EAX nose 24" thickness came
through as 1 11/16", a full inch under its neighbours (the unit suite's foil invariants caught it: a board would get
thicker toward the nose); it stays 2 11/16" pending the founder's word — 2 13/16" as printed, or 2 11/16" as kept.
A test that named the Arctic 7'9" SBF as "a blank whose tail sits below the board's centre" now finds its example by
search (that blank first, then every pickable one), since the review raised that tail 12" rocker; two whole-catalogue
stress tests got a 30-second limit after tipping over the default five under load. Goldens and presets unchanged; the
ROCKER picture unchanged; both databases reseeded (223 of 223). The outlier page now lists 102 stations off their
curve (from 133) and 58 unusual readings.

**Two rulings, and the maker reports put back to the catalogs' facts (2026-10-14, later):** the founder confirmed the
6'4"EAX nose 24" thickness stays 2 11/16" and the 6'2"A nose 18" thickness stays 2 7/16" — "I meant the catalog was
wrong" — so both rows carry that ruling as a note and nothing in the data moved. And a correction to the work above: the
maker reports had been rebuilt from the live files after the review, so they showed the founder's figures and dropped
the off-curve notes those figures cured. The founder: "I only wanted the adjustments to be on our site. The facts about
the errors should remain on the maker pages." `scripts/make-catalog-reports.ts` now reads the before-review copy
(`db/seed/blanks/snapshots/2026-10-14-before-review/`, `--from <dir>` for another) and never the live files; the
review page keeps reading the live files, since it shows what the site uses and what is still off. Rebuilt reports
total 133 off-curve stations again (Arctic 4, Marko 52, Millennium 22, US Blanks 55).

**Second review applied (2026-10-14, later; the submitted files now live in `db/seed/blanks/review-decisions/`, the
first one moved there):** 11 decisions came back. Seven were ticks the browser still remembered from the first review
(already so — left as is); one was the 6'4"EAX nose 24" box still holding 1 11/16", left out since the founder has
since ruled 2 11/16"; three were new — the Arctic 7'9" SBF tail 12" thickness 2 3/16" → 2 13/16", the Millennium
5'3"G nose 12" thickness 2 3/8" → 1 11/16" (the founder's own first-review guess, taken back), and the US Blanks 6'5"R
tail 12" rocker to 15/16". That last one exposed a parser fault: `parseInchesText` allowed no space between a whole
number and a fraction, so the first review's "15/16" had been written as 1 5/16" (the one such figure in that file —
every other plain fraction had a one-digit numerator). Fixed in `blank-report-shared.ts`: a space is required and a
bare fraction is read on its own. The 6'5"R row was set to 15/16" by hand with an honest note, which the apply
script's stale-figure check then rightly refused to re-apply. The same fault had printed "15/16" = 1 5/16"" and
"13/16" = 1 3/16"" on three maker-report lines (one each in the Arctic, Millennium and US Blanks reports) — reports
rebuilt from the before-review copy, the three PDFs re-sent. The review page now embeds every submitted decision
(HANDLED, read from the review-decisions folder) and, when it loads, clears a tick already submitted and handled
(same blank, station, attribute, figure and note, not touched since that file was generated) and any remembered
tick whose note is no longer on the page, saying so beside the tick count — so the next submit carries only new
decisions. Proved headless on a file:// copy, so the founder's real ticks on the dev server were never touched.
Suite green (4692), goldens and presets unchanged, both databases reseeded (223 of 223). The outlier page now lists
104 off-curve and 57 unusual.
