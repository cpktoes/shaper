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
