# Brief — side panels redesigned from the founder's copy-edit canvas (2026-10-17)

The founder reviewed every design screen's wording on a design canvas, then commented
screen by screen asking for structural changes. They approved the drawn result ("yes, build the
FINS, VOLUME, RAILS and ROCKER changes"). Everything below is a DECIDED design: build it, do not
re-open it. The drawn canvas boards are reference only (not repo files), at:

  /private/tmp/claude-501/-Users-kontoes-Code-shaper/63066271-98aa-4087-8986-cb158985ac10/scratchpad/final/project/
    Main.dc.html (TEMPLATE side panel), TemplateWings.dc.html, TemplateViewer.dc.html,
    RockerControls.dc.html, RailsControls.dc.html, VolumeControls.dc.html,
    FinsControls.dc.html, FinsModelInfo.dc.html

Gold dashed tags in those files (`<span class="w">…`) are annotations, never app copy. Blue
`<span class="v">` figures are sample readings, never copy. Everything else is the copy.
Never copy those HTML files into the repo (Tailwind scans .planning for class names).

The unifying idea across screens: **an INPUTS section at the top of each side panel; where a
screen can import values from another screen, one tick box imports them and, while ticked, a
single "… details are imported: …" line shows the values in use and the controls they replace
are HIDDEN (today they are greyed). Unticked, the manual controls show as today.**

Every figure in the new lines goes through `lib/geometry/units.ts` / `measure-display.ts`
(CLAUDE.md Rule 2 — dims cm one decimal, marks whole mm, the 12" station reads `12"` /
`30.5 cm` via the existing station-label helper; a unit is carried once per line of running
text where the existing precedent does that). Put each new line builder in `lib/geometry/` as a
pure function with Imperial + Metric unit tests (Rule 1), next to the precedent `boardLine()` in
`lib/geometry/blank-reasons.ts` (which already prints `TEMPLATE details are imported: 6'0" × 19"`).

Users are shapers, not developers: commit messages and the SUMMARY say what changes on screen.

---

## 1. ROCKER (components/rocker/rocker-editor.tsx, rocker-controls.tsx)

1a. **INPUTS section** (a new, non-collapsible ruled section heading "Inputs", shown in caps like
    every sidebar heading) directly under the title/subtitle. It holds:
    - the existing `boardLine()` line ("TEMPLATE details are imported: 6'0" × 19"", Metric
      "… 182.9 × 48.3 cm"), MOVED here from under the subtitle — no tick box on ROCKER (the
      founder: "This page requires the template to be used… just write the details");
    - the Center Thickness typed field + its slider, MOVED here from the CENTER THICKNESS section.
    The separate CENTER THICKNESS section and heading are REMOVED.
1b. **No blank picked:** the separate ROCKER and THICKNESS sections become ONE collapsible section
    headed "Rocker & Foil" with intro "Hand-set until you pick a blank." and a compact grid:
    column headers ROCKER and THICKNESS; a NOSE group with rows "Tip" then `@ 12"`; a TAIL group
    with rows `@ 12"` then "Tip" (nose-to-tail order along the board). Each cell is a value box
    (the SliderRow `valueBox` read-out, as the Customize Rocker popup uses) above its own slider.
    Same eight values and the same setters as today's eight sliders; Metric reads `@ 30.5 cm`.
    Give every slider a distinct screen-reader name (e.g. "Nose tip rocker", "Nose 12" thickness").
1c. **Blank picked:** the THICKNESS section is renamed "Foil"; its contents and order stay exactly
    as they are today (intro, Nose Tip, Nose @ 12", Tail @ 12", Fine-tune off, Tail Tip,
    ↺ Reset Fine-Tune, Tip Style, Nose/Tail Thinning Starts). The ROCKER & FOIL grid does not show
    with a blank picked (the rocker comes from the blank), exactly as today's ROCKER section.
1d. Keep every `Live` / rocker-live-controls gating (greyed/inert by tab and phone layout) working
    for the moved and regrouped controls; keep the section-open state for the remaining collapsible
    sections (BLANK, BOARD ON BLANK, ROCKER & FOIL / FOIL).

## 2. RAILS (components/rails/rail-controls.tsx, rail-band-editor.tsx)

2a. Subtitle becomes "Design and shape consistent rails".
2b. **INPUTS section** with one tick box "Import Rocker & Foil Values" (replacing
    "Use Board's Rocker & Foil Thickness" — same state, `railsImportFoilThickness`). Ticked: the
    line "Thickness details are imported: 1 5/16" nose @ 12" · 2 1/2" center · 1 9/16" tail @ 12""
    (marks; Metric "33 mm nose @ 30.5 cm · 64 mm center · 40 mm tail @ 30.5 cm"), and each rail's
    thickness slider (Thickness @12" on Nose/Tail, Board Thickness on Center) is HIDDEN, not greyed.
    Unticked: no line; the sliders show. The two help lines ("Thickness comes from the ROCKER
    screen…" / "You're typing your own thickness here…") are REMOVED.
2c. Each rail group heading (NOSE RAIL / CENTER RAIL / TAIL RAIL) gets a **"View" tick box** at the
    right end of its ruled heading, replacing the ▾/▸ open/close arrow. Unticked hides that rail's
    controls AND its plot — exactly today's closed-group behaviour, so it is the same state, shown as
    a tick box. The ADVANCED sub-fold inside each rail keeps its arrow. On an upright phone the
    NOSE/CENTER/TAIL switch keeps its current behaviour — decide (and state in the plan) whether the
    View boxes show there; do not break the phone switch.

## 3. VOLUME (components/volume/volume-controls.tsx, design-store.tsx as needed)

3a. "Primary Inputs" heading becomes "Inputs".
3b. The two tick boxes ("Measure This Board's Real Shape (off = quick estimate from board type)" and
    "Use This Board's Real Rail & Thickness Data") become ONE: "Import Designed Board". Ticked = both
    of today's on (real outline measured + real rail & thickness data). Unticked = quick estimate.
    The founder accepted losing the in-between state (real outline + board-type thickness).
3c. Ticked: the line "Board details are imported: 6'0" × 19" × 2 1/2", and the rail shapes from
    RAILS." (Metric: "182.9 × 48.3 × 6.4 cm, and the rail shapes from RAILS." — unit once, like
    boardLine), and Board Length / Board Width / Center Thickness / Board Type are HIDDEN.
    Unticked: those four controls show (quick estimate), as today.
3d. Decide what shows when the real data isn't available (today each box renders only when its
    data exists): most likely no box and the manual controls. Saved boards must keep loading — if the
    two stored flags stay in the data, derive the one box from them rather than migrating anything.

## 4. FINS (components/fins/fin-controls.tsx, fin-model-info.tsx, fin-placement-editor.tsx)

4a. "Import Template Values" becomes "Import Designed Board" (same state, `finsImportTemplate`).
    Ticked: the line "TEMPLATE details are imported: 6'0" · 14 3/4" tail @ 12" · Squash tail ·
    4" tail block" — the tail block only for tails that have one (squash, diamond, swallow; not pin
    or round), plus " · 1 1/2" deep" for diamond and swallow. Metric e.g. "182.9 cm · 37.5 cm tail @
    30.5 cm · Squash tail · 10.2 cm tail block". Board Length, Tail Width @ 12" and Tail Shape are
    HIDDEN while ticked; unticked they show as today (FINS keeps its own stored values).
4b. ADVANCED is reordered nose to tail: Forward Fins block first, then Rear Fins (quads), then the
    Center Fin block, then ↺ Reset Advanced Settings. Contents of each block unchanged.
4c. MODEL INFO tab restyled to the app's heading pattern: the "Model Info" title at the sidebar title
    size (`text-lg`, like Template Builder — today `text-xl`); its one-line note directly under it in
    `text-sm text-surf-ink-muted` with no heavy rule (today `border-b-2`); each block heading
    (Convention, Single Model, …) in the sidebar's ruled section-heading style (the `SectionHeading`
    look in outline-controls.tsx: `text-xs`, ruled underline); body `text-sm`; model names stay bold.
    Wording unchanged.

## 5. TEMPLATE wording (outline-controls.tsx, wing-controls.tsx, outline-editor.tsx, wings-panel.tsx)

5a. Subtitle "Design and print full sized surfboard templates" → "Design and print full sized templates".
5b. "View Construction Lines" → "Show Drag Points"; on the WINGS sidebar its note "(the wing's grab
    points too)" → "(the wing's too)". The drawing's toolbar labels/tooltips "Show construction
    lines" / "Hide construction lines" → "Show drag points" / "Hide drag points" on both the VIEWER
    and WINGS tabs (the founder: "Good, I like it").
5c. "Show fins" + "(marks only, no dims)" → "Show fin placement" with no note (the Settings block is
    shared by the Template Builder and the WINGS sidebar, so both change).

## Not in this task
- (Moved INTO this task, Plan 01 / RAILS, on the founder's ruling 2026-10-17: "keep the Home-Screen
  note … but change it to 'Printing may not be available from …' because it seems to work from my
  phone".) The RAILS View Full Sized popup's iPhone Home-Screen-app footer note
  (components/rails/view-full-sized-dialog.tsx ~:310) changes from "Printing isn't available from
  the Home-Screen app — open this page in Safari to print the full-sized rail." to "Printing may not
  be available from the Home-Screen app — open this page in Safari to print the full-sized rail."
  Second ruling, same evening ("yes, show the Print button too"): in the iOS Home-Screen app the
  popup no longer hides anything — the Print button shows, the "In your print dialog, turn off
  'Fit to page' …" note shows, and the phone note reads in full ("Shown smaller than actual size —
  tap Print for the full-sized rail."), exactly as in Safari — and the softened "Printing may not
  be available …" note shows there as well, under the others. Update every test that pins the old
  Home-Screen hiding.
- No database, no migration, no deploy, no push.

## Tests
- Unit tests for every new pure line builder (Imperial + Metric, each tail shape for FINS).
- Grep EVERY e2e spec and unit test for each changed or hidden LABEL (not just the route): e.g.
  "Use Board's Rocker & Foil Thickness", "Thickness comes from the ROCKER screen", "Primary Inputs",
  "Measure This Board's Real Shape", "Use This Board's Real Rail", "Import Template Values",
  "Center Thickness" (section heading), "Rocker" / "Thickness" section headings on ROCKER,
  "View Construction Lines", "construction lines", "Show fins", "Board Thickness" (now hidden while
  imported), the rail-group disclosure buttons. Specs that reach a screen from another screen count.
- Desktop baselines (`e2e/desktop-baseline.spec.ts-snapshots/*.png`, macOS-local) will change for
  every screen whose side panel changes; re-record only the screens a plan changes, with
  `--update-snapshots=all -g "<SCREEN>"`, and inspect old vs new first. Do NOT edit the spec's
  header log — the orchestrator writes one entry at the end.
