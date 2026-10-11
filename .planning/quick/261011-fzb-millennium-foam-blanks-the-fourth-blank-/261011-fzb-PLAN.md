---
phase: quick-261011-fzb
plan: 01
type: execute
wave: 1
depends_on: []
files_modified:
  - db/seed/blanks/millennium_foam_stations.csv
  - lib/blanks/seed-files.ts
  - lib/blanks/vendors.ts
  - lib/blanks/catalog.ts
  - lib/geometry/blank-reasons.ts
  - lib/geometry/__fixtures__/round-nose-golden.json
  - lib/db/schema.ts
  - scripts/seed-blanks.ts
  - components/app-settings-dialog.tsx
  - components/rocker/blank-picker.tsx
  - lib/blanks/vendors.test.ts
  - lib/blanks/catalog.test.ts
  - lib/blank-makers-preference.test.ts
  - lib/geometry/blank-reasons.test.ts
  - e2e/app-settings.spec.ts
  - e2e/blank-makers.spec.ts
  - e2e/summary-blank.spec.ts
autonomous: true
requirements: [QT-261011-fzb]
must_haves:
  truths:
    - "ROCKER's blank list offers Millennium Foam's 61 blanks (5'0\"WS to 12'2\"P) after the other three makers', each with the catalog's own station numbers and a DATASHEET footnote wherever the catalog's two units disagreed."
    - "App Default Settings shows four BLANK MAKERS tick boxes, two to a row; unticking Millennium Foam hides its blanks like any other maker; the last maker ticked is still locked."
    - "The catalog note under the list names Millennium Foam; the list's sentences say 'the four catalogs'."
    - "Nothing else in the catalogue moves: 101 US Blanks, 33 Arctic Foam and 28 Marko Foam blanks, the same four Marko SUPs left out; the four presets still open in the same US Blanks blanks; saved boards keep their own blank copy."
  artifacts:
    - path: "db/seed/blanks/millennium_foam_stations.csv"
      provides: "61 blanks, 429 station rows, the 13-column catalogue header, CRLF"
      contains: "Millennium Foam"
---

<objective>
Add Millennium Foam as the fourth blank maker — the founder's request of 2026-10-11 ("lets add Millennium Foam
blanks to the app. Import dims the same way we did before and add to the app blank selection options"), made live
the same day on the founder's "Can we get this live quick?".

In a shaper's words: ROCKER's blank list now also offers every blank in Millennium Foam's 2024 catalog, with the
numbers printed on its pages; the settings pop-up has a fourth tick box to show or hide them.

The numbers were read from the catalog PDF by the orchestrator before this plan (see 261011-fzb-EXTRACTION.md: every
cell cross-checked between the page's inch label and its centimetre line, the inch label used as for US Blanks,
three misprints settled by the centimetre line, rounded noses 0 wide and pointed noses 1" wide by the founder's rule).
</objective>

<tasks>
1. Catalogue + library: copy the finished CSV to db/seed/blanks; add the file to SEED_CSV_FILES; add "Millennium
   Foam" to KNOWN_BLANK_VENDORS (last, catalogue order); the catalog note names it; "the three catalogs" becomes
   "the four catalogs" in vendors.ts and blank-reasons.ts; the seed script's count line walks KNOWN_BLANK_VENDORS;
   comments that said three say four; unit tests pin 223 blanks / 219 pickable and the four-maker wording;
   regenerate the round-nose golden (the 21 rounded Millennium noses join it) and the preset blanks (unchanged).
2. Settings + browser tests: the BLANK MAKERS block becomes two tick boxes to a row (four names do not fit one row
   in the pop-up); app-settings and blank-makers specs expect four makers, one more untick before the last is locked,
   and the new "Showing … only" wording.
3. Prove it: whole unit suite, tsc, lint, build on main; the four maker-related browser specs on all three device
   profiles; seed the development database and run the seed's read-only check.
</tasks>

<execution_note>
Executed inline by the orchestrator (no planner/executor subagents) at the founder's request for speed, under this
quick task's id so STATE.md and the task folder stay in step.
</execution_note>
