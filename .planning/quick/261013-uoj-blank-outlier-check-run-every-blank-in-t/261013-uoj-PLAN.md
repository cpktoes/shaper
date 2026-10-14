---
phase: quick-261013-uoj
plan: 01
type: execute
wave: 1
depends_on: []
files_modified:
  - lib/blanks/outliers.ts
  - lib/blanks/outliers.test.ts
  - scripts/find-blank-outliers.ts
  - .gitignore
autonomous: true
requirements: [QT-261013-uoj]
must_haves:
  truths:
    - "A script runs every blank the app holds (all four makers, the committed CSVs the database mirrors) through the app's own live curve rule and names the stations that sit off it, scored per maker so 6\" stations are judged more tightly than 12\" ones; nothing in the data changes."
    - "A dev-window page (served by the dev server, never shipped) tables the findings and draws every named blank's rocker, thickness and width with the flagged stations in red beside the point the rest of the blank implies."
    - "The maths is pure and unit-tested: a smooth synthetic blank reads clean, a bumped station is named, tips and anchors are never asked."
---

<objective>
Find, don't fix: which printed stations in the catalogue look like outliers against their own blank — the founder
(2026-10-13) sees curves on ROCKER that are not smooth and suspects a 12" or 18" tail station here and there.
Deliver a repeatable check and a page in the dev window that shows the suspects drawn.
</objective>

<tasks>
1. `lib/blanks/outliers.ts` + test: leave-one-out residuals on the live rule (`prepareRootCurve`, zero tips rounded)
   for every interior non-anchor station; robust z per maker + attribute with an absolute floor; a second, weaker
   signal from each station's share of its anchor against the maker's norm (reaches tips and centres).
2. `scripts/find-blank-outliers.ts`: reads the catalogue through `readSeedCatalog`, writes `blank-outliers.html` (tables
   + SVG plots) and `.json` to `public/__dev/` (gitignored, served by any running dev server at /__dev/…).
3. Run it, open the page in the Browser pane, read the findings, report to the founder with a picture.
</tasks>

<execution_note>
Executed inline by the orchestrator under this quick id (the founder's standing preference for speed on this work).
</execution_note>
