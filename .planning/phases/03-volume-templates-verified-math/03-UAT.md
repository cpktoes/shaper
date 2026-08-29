---
status: complete
phase: 03-volume-templates-verified-math
source: [03-01-SUMMARY.md, 03-02-SUMMARY.md, 03-03-SUMMARY.md, 03-04-SUMMARY.md, 03-05-SUMMARY.md, 03-06-SUMMARY.md, 03-07-SUMMARY.md]
started: 2026-08-29T06:13:41Z
updated: 2026-08-29T06:43:04Z
---

## Current Test

[testing complete]

## Tests

### 1. Export Template dialog from both screens
expected: On the Template screen, pressing Export Template opens the preview dialog — title, description, Letter/A4 picker (Letter default), tile-grid diagram sized to the board, page-count copy. Switching paper redraws the diagram and updates the count. Download PDF saves a file and closes the dialog. The Summary screen's Export Template button opens the identical dialog and is absent from print preview.
coverage_id: 03-04-D3
result: pass

### 2. Template screen toolbar and Wide View (re-check after fix)
expected: The four toolbar buttons (rotate, Export Template, construction lines, wide view) sit evenly spaced with legible icons in all four themes. The construction-lines button and the sidebar checkbox agree in both directions. Wide View hides the sidebar, turns construction lines on, and gives the drawing the full window — smoothly, without the drawing area visibly flashing or rebuilding (this exact behavior was just fixed in code review). Leaving Wide View restores the sidebar and the prior construction-lines setting; a reload returns to defaults.
coverage_id: 03-05-D3
result: pass

### 3. Volume recalculates live from outline edits
expected: Widening the widepoint on the Template screen then opening the Volume screen (client-side navigation, no reload) shows a larger litres figure, and the volume card discloses which method produced the number (drawn outline vs. area-factor estimate).
coverage_id: 03-07-D2
result: pass

### 4. Order form prints on two clean pages
expected: Print preview of the Summary order form shows two portrait pages with nothing clipped, the board undistorted, chips and output rail legible, and both faint reference lines (station and widepoint) visible — including for a 25in-widepoint board and from a dark theme (which prints white).
coverage_id: 03-06-D2
result: pass

### 5. Printed template is true 1:1 scale
expected: Printing the exported template at 100% scale, the nose page's 2in scale-check square measures exactly 2 inches on both sides with a physical ruler.
coverage_id: 03-01-D3
result: pass

### 6. Printed template pages read correctly
expected: On paper, each template page shows the working marks (nose 12in, tail 12in, centre, widepoint), the refined name block, alignment/match marks across page joins, and the how-to box — all legible and correctly placed.
coverage_id: 03-03-D5
result: pass

### 7. Complete full-size template can be assembled
expected: A shaper can export, print at 100%, and tape together a complete full-size template from a saved board — pages join continuously at the alignment marks, with the correct marks, name/dims block and how-to guidance.
coverage_id: 03-07-D3
result: pass

### 8. CI is green on GitHub
expected: The GitHub Actions run for the latest pushed commit concludes green — tests, lint and build all pass away from the local machine.
coverage_id: 03-02-D1
result: pass

### 9. Template layout math covers every outline point with exact tile overlap
expected: computeTemplateLayout/computeTemplateMarks cover every sampled outline point, overlap tiles by exactly TEMPLATE_OVERLAP_MM, and tile multi-column at 25in widepoint, for Letter and A4.
result: pass
source: automated
coverage_id: 03-01-D1

### 10. buildTemplatePdf produces a real PDF with matching page count
expected: Output begins with PDF magic bytes; page count matches the layout.
result: pass
source: automated
coverage_id: 03-01-D2

### 11. Derived template/rail/volume values asserted against real geometry
expected: deriveTemplateValues, deriveRailValues, deriveEffectiveVolume asserted directly for every board preset.
result: pass
source: automated
coverage_id: 03-02-D2

### 12. Live-recompute invariant proven in pure functions
expected: Widening a preset's widepoint and re-running summarizeDesign produces strictly larger litres.
result: pass
source: automated
coverage_id: 03-02-D3

### 13. Volume method disclosure fields correct
expected: computeVolume's templateAvailable/importingTemplate fields disclose whether litres came from the drawn outline or the area-factor estimate.
result: pass
source: automated
coverage_id: 03-02-D4

### 14. markPlacements returns the four working marks on valid pages
expected: Nose 12in, tail 12in, centre, widepoint each on a page whose stationRange contains its station, with extents matching sampleOutline.
result: pass
source: automated
coverage_id: 03-03-D1

### 15. matchMarkPositions places paired crosshairs in every overlap band
expected: Two alignment crosshairs per shared overlap band, identical (station, halfWidth) on both pages — row-adjacent and column-adjacent cases.
result: pass
source: automated
coverage_id: 03-03-D2

### 16. templateNameBlockText handles empty, short and too-long names
expected: 'Untitled Board' fallback, short names unchanged, long names truncated with ellipsis measured to fit.
result: pass
source: automated
coverage_id: 03-03-D3

### 17. How-to lines adapt to layout; PDF stays valid with all furniture
expected: Three lines single-column, four multi-column (sideways-taping); buildTemplatePdf still one page per layout page with valid bytes.
result: pass
source: automated
coverage_id: 03-03-D4

### 18. ExportPreviewDialog composes the preview-first flow
expected: Title, description, Letter/A4 picker (Letter default), proportional tile diagram, page-count copy, Download/Cancel; no PDF bytes built until Download.
result: pass
source: automated
coverage_id: 03-04-D1

### 19. Both entry points share one dialog; Summary button hidden from print
expected: Template toolbar and Summary action row open the same ExportPreviewDialog under 'Export Template'; Summary entry stays inside data-print-hide.
result: pass
source: automated
coverage_id: 03-04-D2

### 20. Construction-lines toolbar button wired to shared state
expected: Button at right-20 matching the toolbar box style, toggling the same showConstruction state as the sidebar checkbox, accent fill when ON.
result: pass
source: automated
coverage_id: 03-05-D1

### 21. Wide-view button behavior implemented without persistence
expected: Button at right-30 hides sidebar, forces construction lines on entering, restores prior value on leaving; not persisted, no effects.
result: pass
source: automated
coverage_id: 03-05-D2

### 22. Print CSS raises reference-line contrast via tokens only
expected: order-form.css @media print uses color-mix on the same base tokens; no literal colours; globals.css and viewer untouched.
result: pass
source: automated
coverage_id: 03-06-D1

### 23. CI concluded success on this phase's pushed commits
expected: GitHub Actions run 33236030953 ran the geometry suites, lint and build against pushed phase commits and concluded success.
result: pass
source: automated
coverage_id: 03-07-D1

## Summary

total: 23
passed: 23
issues: 0
pending: 0
skipped: 0
blocked: 0

## Gaps

[none yet]
