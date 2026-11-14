---
status: resolved
trigger: "volume-litres-say-what-they-include — The VOLUME page's litres should say that they take into account the finished rail shape and the bottom contours (UAT 17 test 5, G-17-5)"
created: 2026-11-10T00:00:00Z
updated: 2026-11-14T13:00:00Z
---

## Current Focus

hypothesis: CONFIRMED — the litres already count both the finished rail and the bottom contours; the gap is words only. VOLUME's INPUTS card (the "volume input") names TEMPLATE, ROCKER & FOIL and "Rail shapes from RAILS" but never BOTTOM and never "finished", and the GUIDE's Import Designed Board card likewise names only TEMPLATE, ROCKER and RAILS.
test: traced computeCrossSectionVolume station by station; ran a scratch probe on the four presets with and without a cut
expecting: (met) litres drop with a cut by exactly the bottom's foam off; every station subtracts the finished rail's blend areas
next_action: return ROOT CAUSE FOUND to the orchestrator (diagnose-only)
bug_class: Bohrbug (deterministic — a wording gap, not a maths gap)

reasoning_checkpoint:
  hypothesis: "The founder can't tell what VOLUME's litres include because the INPUTS readout card's caption ('From TEMPLATE and ROCKER & FOIL') and foot ('Rail shapes from RAILS') at lib/geometry/imported-readout.ts:75 and :167 never mention BOTTOM or the finished rail, even though the number counts both."
  confirming_evidence:
    - "volume.ts:1455 — each station's area is the cut area less both rails' finished-rail blends (railBlendArea of sectionFinishedRail)"
    - "volume.ts:1329-1352 + design.ts:207-208 — bottomed() lifts every section's bottom by the BOTTOM foam off and corrects the area; designCrossSectionInput passes foamOffAt whenever the bottom cuts anything"
    - "Scratch probe: Shortboard 29.613 L flat -> 28.866 L with a Deep Single Concave (0.747 L off), and summarizeDesign (rack card) reads the same two figures"
    - "imported-readout.ts:159-168 builds the card's words; imported-readout.test.ts:284/290 and two e2e specs pin them"
  falsification_test: "If any station's area ignored foamOffAt or skipped railBlendArea, a cut board's litres would equal the flat board's or the cut-rail litres; they do not."
  fix_rationale: "The number is already right, so only the words that describe it change — the card and the GUIDE card — which is what the founder asked for."
  blind_spots: "On a vee or belly the litres thin the planed finished rail by the lift (bottomedHalfSection), while RAILS re-bands the rail at the lifted thickness (railsOnTheBottom); design.ts:327-330 records they agree to a fraction of a mm on a short rail and part most on the Longboard's rolled rail. Also the VOLUME card's working rows (three Cross-Section Thickness rows and Length-Weighted Effective Thickness) are the three-station estimator and do NOT move with a cut. G-17-6 (finished rail rounding channels) is separate and may change the litres' sections."
  candidate_causes:
    - "data/copy: the readout card's caption and foot strings omit BOTTOM and 'finished' (confirmed)"
    - "code/maths: the litres might not subtract the bottom or the finished rail (eliminated by trace + probe)"
  and_gate: "no — one cause; the maths is complete, only the label is missing"

## Symptoms

expected: On the VOLUME design screen the shaper can tell what the litres number takes into account — the finished rail shape and the bottom contours included.
actual: Founder's words: "The volume input should say that it takes into account the finished rail shape and bottom contours". Litres number NOT reported wrong.
errors: none
reproduction: Test 5 in .planning/phases/17-bottom-contours/17-UAT.md, on https://www.shaperassistant.com/design/volume
started: discovered during Phase 17 UAT (BOTTOM live 2026-11-10)

## Eliminated

- hypothesis: The VOLUME litres leave out the bottom contours' foam off
  evidence: designCrossSectionInput (lib/geometry/design.ts:199-208) adds foamOffAt (and bottomWallsAt for channels) whenever bottomHasCut; boardSectionsWith's bottomed() (lib/geometry/volume.ts:1329-1352) lifts every section's bottom and corrects its area; the store's crossSectionInput passes state.bottom (components/design/design-store.tsx:1377-1385). Probe: Shortboard 29.613 -> 28.866 L with Deep Single Concave.
  timestamp: 2026-11-10T00:00:00Z

- hypothesis: The VOLUME litres count the raw band cuts, not the finished rail
  evidence: lib/geometry/volume.ts:1447-1456 — area = stationArea(cut profile) - 2*railBlendArea(sectionFinishedRail(result, domed)) at every one of the 51 stations; probe shows the blends take about 0.27 L off a Shortboard, 0.98 L off a Longboard.
  timestamp: 2026-11-10T00:00:00Z

## Evidence

- timestamp: 2026-11-10T00:00:00Z
  checked: .planning/debug/knowledge-base.md
  found: no knowledge base file exists; no MemPalace match attempted
  implication: no known-pattern candidate

- timestamp: 2026-11-10T00:00:00Z
  checked: components/volume/volume-controls.tsx:102-139 and lib/geometry/imported-readout.ts:68-76,159-168
  found: Sidebar reads "Volume Estimator / Approximate volume of a designed board", then INPUTS, the "Import Designed Board" box, then a readout card captioned "From TEMPLATE and ROCKER & FOIL" (Length, Width, Thickness) with foot "Rail shapes from RAILS". No mention of BOTTOM or of the finished rail.
  implication: this INPUTS card is "the volume input" the founder means; it is the one place the page lists what goes in

- timestamp: 2026-11-10T00:00:00Z
  checked: components/volume/volume-calculation-card.tsx:84-92,178-192
  found: ESTIMATE tab: "Estimated Volume" + "51 cross-sections integrated" + italic "From the board's own finished cross-sections along its length." + foot "This figure is real cross-sections taken along the board's own length, added up with Simpson's rule — checkable against a published blank's own stated volume." Mentions "finished" once, never the bottom.
  implication: the ESTIMATE card half-says it; the bottom is unmentioned anywhere on VOLUME

- timestamp: 2026-11-10T00:00:00Z
  checked: components/guide/words/volume.ts:28-32 and .planning/phases/18-a-guide-on-every-page/18-GUIDE-WORDS.md:329-332
  found: GUIDE "Import Designed Board" card: "51 real cross-sections with the RAILS rails"; "Finish TEMPLATE, ROCKER and RAILS first"; "the foam off should be the difference" (a blank's foam off). No BOTTOM, no "finished". Held line for line by components/guide/words/volume.test.ts.
  implication: the GUIDE card needs the same words, edited on 18-GUIDE-WORDS.md first (it is the source of truth)

- timestamp: 2026-11-10T00:00:00Z
  checked: lib/geometry/volume.ts:1295-1556 (boardSectionsWith) and :1683-1735 (computeCrossSectionVolume)
  found: The quoted litres are Simpson over boardSections' areas. Each station: finished rail (cut area less blends, :1447-1456), wings, tips, tail roll, then bottomed() applies BOTTOM's foam off (and channel walls) and corrects the area (:1329-1352).
  implication: the litres include both the finished rail and the bottom contours — the founder's sentence is TRUE

- timestamp: 2026-11-10T00:00:00Z
  checked: scratch probe (npx tsx) over the four presets, flat vs their sketch-021 opening cuts vs a Deep Single Concave
  found: shortboard 29.613 -> 28.866 L (DSC, 0.747 off); fish 34.649 -> 34.336 (Panel Vee) / 33.919 (DSC); midlength 49.404 -> 48.177 (three cuts) / 48.339 (DSC); longboard 73.614 -> 71.057 (three cuts) / 72.108 (DSC). summarizeDesign gave identical figures. Finished-rail blends about 0.27 / 0.30 / 0.45 / 0.98 L.
  implication: direct observation that the number moves with the bottom and carries the finished rail; rack cards agree

- timestamp: 2026-11-10T00:00:00Z
  checked: every reader of the litres
  found: VOLUME ESTIMATE card + SUMMARY's compact card (quotedVolumeLitres), BOTTOM's DATA first line (bottom-data.tsx:81-85, quotedVolumeLitres vs quotedVolumeLitresBeforeBottom), the phone's screen tiles (screen-tiles.tsx:93,126), order form (order-form.tsx:381,490), Overview Sheet / Full Sized Template / Paper Saver (export-preview-dialog.tsx:262 -> build-template-pdf.ts:829), the VOLUME GUIDE card (guide-volume.ts:382) all read the store's one quotedVolumeLitres; Board Rack cards read summarizeDesign (rack-models.ts:63-67, passes fields.bottom; design.ts:527-545 same input builder); 3D reads the same boardSections (D-05).
  implication: one number everywhere, bottom and finished rail included in all of them

- timestamp: 2026-11-10T00:00:00Z
  checked: computeVolume (lib/geometry/volume.ts:398-461) and design-store.tsx:1287,1357-1360
  found: The card's working rows (Template Area, Tail/Center/Nose Cross-Section Thickness, Length-Weighted Effective Thickness) come from the three-station estimator: finished-rail blends yes (deriveRailValues, design.ts:229-242), bottom NO (no bottom parameter; reads railBands, not railBandsOnBottom).
  implication: on a cut board those rows do not move while the litres under them drop; the new words should be on the litres / the INPUTS card, and should not imply the rows above include the bottom

## Resolution

root_cause: A missing label, not a maths error. The VOLUME litres already count the finished rail shape (every one of the 51 cross-sections takes the finished rail's blends off the cut rail, lib/geometry/volume.ts:1447-1456) and the bottom contours (every section's bottom is lifted by BOTTOM's foam off, lib/geometry/volume.ts:1329-1352, fed by lib/geometry/design.ts:199-208). But the page never says so: the INPUTS readout card is captioned "From TEMPLATE and ROCKER & FOIL" with the foot "Rail shapes from RAILS" (lib/geometry/imported-readout.ts:75,159-168), the ESTIMATE card's line says only "finished cross-sections" (components/volume/volume-calculation-card.tsx:87,191), and the GUIDE's Import Designed Board card names only TEMPLATE, ROCKER and RAILS (components/guide/words/volume.ts:28-32, from 18-GUIDE-WORDS.md:329-332). BOTTOM is named nowhere on VOLUME.
fix: (diagnose only — not applied)
verification: (diagnose only)
files_changed: []

## Resolution
shipped: Phase 17 fix plan 17-17 (the founder's sentence on VOLUME's INPUTS card; BOTTOM named on the GUIDE's Import Designed Board card), live 2026-11-11 as main 93c0ea8f and re-checked by the founder. The ESTIMATE tab's other words stay as the to-do of 2026-11-11. Closed 2026-11-14 at the v1.5 milestone close.
