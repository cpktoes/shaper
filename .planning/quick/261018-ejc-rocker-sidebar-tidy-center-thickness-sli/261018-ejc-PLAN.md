---
phase: quick-261018-ejc
plan: 01
type: execute
wave: 1
depends_on: []
files_modified:
  - components/rocker/rocker-controls.tsx
  - components/rocker/rocker-live-controls.ts
  - components/design/slider-row.test.ts
  - components/rocker/rocker-datasheet.tsx
  - components/rocker/blank-picker-dialog.tsx
  - components/rocker/blank-picker.tsx
  - components/rocker/remove-blank-dialog.tsx
  - components/design/board-lock-scope.test.ts
  - lib/blanks/vendors.ts
  - lib/blanks/vendors.test.ts
  - e2e/helpers/blank-picker.ts
  - e2e/rocker-remove-blank.spec.ts
  - e2e/rocker-panel.spec.ts
  - e2e/rocker-live-controls.spec.ts
  - e2e/rocker-blanks.spec.ts
  - e2e/blank-makers.spec.ts
  - e2e/app-settings.spec.ts
  - e2e/touch-sizing.spec.ts
  - e2e/rocker-cut.spec.ts
  - e2e/rocker-custom.spec.ts
  - e2e/phone-screen-tiles.spec.ts
  - e2e/desktop-baseline.spec.ts-snapshots/rocker-desktop-desktop-darwin.png
  - .planning/quick/261018-ejc-rocker-sidebar-tidy-center-thickness-sli/261018-ejc-SUMMARY.md
autonomous: true
requirements: [QT-261018-ejc]

estimate:
  tokens: 150000
  raw_tokens: 150000
  tasks: 3
  confidence: low

must_haves:
  truths:
    - "R1: On ROCKER, INPUTS holds Center Thickness as ONE slider with its value in its label, like every other slider — `Center Thickness — 2 1/2\"` in Imperial, `Center Thickness — 64 mm` in Metric (a mark: whole millimetres, through measure-display). There is no typed box in the sidebar any more."
    - "R1: Center Thickness behaves exactly as before apart from the box — live on VIEWER and on DATASHEET, dimmed and inert on TOP VIEW (quick 261006-v20 D-01/D-02), greyed and disabled on a locked board — and moving it changes the board's one centre: the DATASHEET's Center cell, RAILS' imported line and the blank fit check all follow."
    - "R1: The DATASHEET table's own typed Center cell stays exactly as it is — that is where a shaper types an exact centre — and typing there moves the sidebar slider's label to the same value."
    - "R2: The makers' catalogue and trademark note (`Blank dimensions are from manufacturers' published catalogs … trademarks of their owners.`) is no longer in the sidebar. It sits in two places, word for word, in the same small muted type: as the last paragraph of ROCKER's DATASHEET tab (with no blank and with one picked), and at the foot of the PICK A BLANK popup, where the maker names and catalogue sizes show (the founder's ruling, 2026-10-18) — the last thing in the popup's scrolling list, in every state of the list."
    - "R2: On an upright iPhone and on a phone held sideways the popup's note never pushes its ✕ off the screen or takes room from its card grid: it sits at the end of the popup's scroll, and scrolled to the end it is wholly on screen."
    - "R3: The muted sentence under Remove This Blank is gone from the sidebar. Tapping Remove This Blank opens a small popup titled `Remove this blank?` that carries that sentence and two buttons, Cancel and Remove Blank. Only Remove Blank removes the blank (one undo still brings it back with its placement and fine-tune); Cancel and Esc keep it and put focus back on the Remove This Blank link; after a removal focus lands on the Pick a Blank button."
    - "R3: On a locked board the Remove This Blank link stays disabled exactly as today, so the popup cannot open; the popup's own Remove Blank button is tied to the lock too."
    - "R3: The popup fits whole on an upright iPhone 14 and Pixel 7 and on a phone held sideways (a real iPhone at 844 x 340, the page Safari leaves; a Pixel 7 on its side), and both its buttons are at least 44 dots tall on a finger."
    - "Every browser test that typed into the old box or clicked Remove This Blank now drives the slider (or the DATASHEET cell, or the popup) and still proves what it proved. Only the ROCKER desktop picture (rocker-desktop.png) is re-recorded; the other four desktop pictures stay byte-identical. The shared typed field and slider row (measure-field.tsx, slider-row.tsx) are untouched, and so is the `TEMPLATE details are imported` line."
  artifacts:
    - path: "components/rocker/rocker-controls.tsx"
      provides: "INPUTS' Center Thickness as one SliderRow named `Center Thickness`, value in the label"
      contains: "sliderLabel=\"Center Thickness\""
    - path: "components/rocker/remove-blank-dialog.tsx"
      provides: "RemoveBlankDialog — the `Remove this blank?` popup with Cancel and Remove Blank"
      contains: "Remove this blank?"
    - path: "components/rocker/blank-picker.tsx"
      provides: "Remove This Blank opens the popup; removal happens only on confirm"
      contains: "RemoveBlankDialog"
    - path: "components/rocker/rocker-datasheet.tsx"
      provides: "the catalogue note as the DATASHEET's last paragraph, in both states"
      contains: "data-blank-catalog-note"
    - path: "components/rocker/blank-picker-dialog.tsx"
      provides: "the catalogue note as the last child of the popup's scrolling list (`data-blank-picker-scroll`)"
      contains: "data-blank-catalog-note"
    - path: "e2e/rocker-remove-blank.spec.ts"
      provides: "browser proof of the popup on a computer, two upright phones and two sideways phones"
    - path: "e2e/helpers/blank-picker.ts"
      provides: "centerThicknessSlider, nudgeCenterThickness, removeBlankDialog, removeThisBlank"
      contains: "export async function removeThisBlank"
  key_links:
    - from: "components/rocker/rocker-controls.tsx (Center Thickness SliderRow onValueChange)"
      to: "onChangeFoil({ center }) -> the store's foil.center -> DATASHEET Center cell, RAILS, blank fit"
      via: "centerSlider.toMm(v), the same conversion the old raw slider used"
      pattern: "onChangeFoil\\(\\{ center: centerSlider\\.toMm"
    - from: "components/rocker/blank-picker.tsx (Remove This Blank link)"
      to: "components/rocker/remove-blank-dialog.tsx onConfirm -> useDesign().removeBlank"
      via: "confirm-only removal; finalFocus back to the link, or to the BLANK button after a removal"
      pattern: "RemoveBlankDialog"
    - from: "components/rocker/rocker-datasheet.tsx"
      to: "lib/blanks/vendors.ts BLANK_CATALOG_NOTE"
      via: "import, rendered as the sheet's last paragraph"
      pattern: "BLANK_CATALOG_NOTE"
    - from: "components/rocker/blank-picker-dialog.tsx"
      to: "lib/blanks/vendors.ts BLANK_CATALOG_NOTE"
      via: "added to the existing vendors import, rendered last inside data-blank-picker-scroll"
      pattern: "BLANK_CATALOG_NOTE"
---

<objective>
Three space-saving changes to ROCKER's sidebar, the founder's words of 2026-10-18:

1. "center thickness on rocker page doesn't need a type in box, just the slider." — Center Thickness in INPUTS becomes a slider only, its value in its label like every other slider. The DATASHEET table's own typed Center cell stays exactly as it is: that is where a shaper types an exact centre.
2. "Blank dimensions are from manufacturers' published catalogs … trademarks of their owners. can be on the dimensions tab rather than in the controls taking up space." — the catalogue note leaves the sidebar for the foot of the DATASHEET tab and, by the founder's ruling of the same day, the foot of the PICK A BLANK popup too, where the makers' names and catalogue sizes show.
3. "And Removing it keeps the rocker and foil at the five stations and re-draws the curve through them, for you to set by hand can turn into a popup after clicking remove blank rather than taking up room on the controls." — Remove This Blank opens a small confirm popup carrying that sentence; the blank goes only when the shaper confirms.

Purpose: the sidebar is shorter and quieter — on a phone, every line saved is drawing room — and removing a blank can no longer happen by a stray tap.
Output: the slider-only Center Thickness row, the note at the foot of the DATASHEET and of the PICK A BLANK popup, a new `RemoveBlankDialog`, one new browser spec, every affected browser test rewritten (never weakened), the ROCKER desktop picture re-recorded, and a plain-English SUMMARY.

Plain English for the founder (use it in the SUMMARY and commit bodies): the board itself never changes because of this work — no number is worked out differently, nothing saved is rewritten. Only where three things sit on the ROCKER screen changes, and Remove This Blank now asks first.
</objective>

<execution_context>
@$HOME/.claude/gsd-core/workflows/execute-plan.md
@$HOME/.claude/gsd-core/templates/summary.md
</execution_context>

<context>
@.planning/STATE.md
@CLAUDE.md

Source files (read each once; the ranges are where the work is):
@components/rocker/rocker-controls.tsx — header doc lines 10-17 and 61-71; imports lines 74-112; INPUTS block lines 418-454 (the Center Thickness row is lines 426-452; `ThicknessRow` at 192-215 is the label pattern to copy)
@components/rocker/rocker-live-controls.ts — comment lines 9 and 35 only
@components/design/slider-row.tsx — the props (`label`, `value`, `min`, `max`, `step`, `onValueChange`, `sliderLabel`, `sliderValueText`); it reads the board lock and dims itself
@components/design/slider-row.test.ts — the ROCKER entry of `ALLOWLIST`, lines 50-55
@components/rocker/blank-picker.tsx — header doc 16-30; `BlankCatalogNote` 252-263; `BlankPicker` 265-341 (Remove This Blank 313-330, the note's render 338)
@components/rocker/rocker-datasheet.tsx — header doc 26-30 ("Under the table: …"); the return's last block, lines ~385-414
@components/outline/wing-dial-in-dialog.tsx — the small design-screen popup to copy (content classes, title class, footer, accent primary button)
@components/app-settings-dialog.tsx lines 174-193 — precedent for a focus prop given a named function that reads refs (passes this repo's lint)
@components/design/board-lock-scope.test.ts — `LOCKABLE_FILES`, lines 14-30
@lib/blanks/vendors.ts lines 22-32 and lib/blanks/vendors.test.ts line 103
@e2e/helpers/blank-picker.ts — the shared ROCKER helpers; add the new ones here
@e2e/rocker-live-controls.spec.ts — `CENTER_BOX`/`CENTER_SLIDER` 98-100 and every use (142-157, 242-243, 262, 286, 300); the sideways device constants 44-56 and describes 321-349 are the pattern for the new spec

Facts measured at plan time (do not re-derive):
- The default board's centre is 63.5 mm: `formatMark` prints `2 1/2"` (Imperial) and `64 mm` (Metric). The slider runs 1/4" to 5" in 1/16" steps in Imperial (`FOIL_THICKNESS_RANGE_IN`), so 4 ArrowRight presses read `2 3/4"`, 16 read `3 1/2"`, and End reads `5"` — the three values the old tests typed. In Metric it runs 7 to 127 mm in 1 mm steps.
- Base UI 1.7.0's slider thumb handles ArrowLeft/ArrowRight/Home/End. `DialogContent`'s `finalFocus` accepts a RefObject or a function returning an element (`node_modules/@base-ui/react/dialog/popup/DialogPopup.d.ts` line 34).
- `BLANK_CATALOG_NOTE` is rendered in exactly one place today: `blank-picker.tsx`'s sidebar copy. The PICK A BLANK popup, the printed pages and the Summary never showed it. The founder ruled (2026-10-18) that it goes on the DATASHEET AND at the foot of the PICK A BLANK popup; the sidebar copy goes; nothing else gets it.
- The PICK A BLANK popup (`blank-picker-dialog.tsx`, ~300-412) is a fixed header (✕ and title), the filter bar, then ONE scrolling column `data-blank-picker-scroll` (`flex min-h-0 flex-1 flex-col gap-3 overflow-y-auto`) holding the intro, the empty / thin / no-match messages and the card groups. It has no footer and no other buttons outside the header and the filter bar, so a paragraph appended as that column's last child only lengthens the scroll — it cannot push the ✕ off the screen or narrow the grid.
- The browser tests that use the old box: rocker-live-controls (CENTER_BOX), rocker-blanks (typeCenterThickness / raiseCenterThickness, the RAILS test), blank-makers (typeCenterThickness), app-settings (~239, types 5), rocker-panel (72), touch-sizing (the generated typed-field loop covers /design/rocker). The ones that click Remove This Blank: rocker-blanks (~141, ~498), rocker-cut (~179), rocker-custom (~503), phone-screen-tiles (~281, ~374). board-lock-screens (:292 disabled, :319 absent), touch-sizing (:307, the link's height) and rocker-live-controls (the link's live/inert checks) test the link itself, which stays — leave them alone. board-lock-screens s-rocker counts DATASHEET typed boxes as "more than 2": the three DATASHEET cells still satisfy it — leave it alone.

Interfaces the executor needs:
- `measureSlider(value, rangeIn, stepIn, 1, system)` returns `{ value, min, max, step, toMm(v) }`; `formatMark(value: Mm, system)`; both from `@/lib/geometry/measure-display`.
- `useDesign()` exposes `removeBlank()` (one undo step) and `blank`; `useControlsLocked()` from `@/components/design/use-controls-locked`.
- `Dialog`, `DialogClose`, `DialogContent` (props: `showCloseButton`, `finalFocus`, `className`), `DialogDescription`, `DialogFooter`, `DialogHeader`, `DialogTitle` from `@/components/ui/dialog`; `Button` from `@/components/ui/button` (default size is 32 px, `coarse:h-11` = 44 on a finger).

Ground rules for the executor (from the orchestrator):
- Playwright always with `PW_PORT=3163 IS_WEBPACK_TEST=1`, every invocation. Check `lsof -nP -iTCP:3163 -sTCP:LISTEN` is empty first. Never start `next dev` in the main checkout, never touch `.next/dev/lock`; port 3000 is the founder's and 3005 the orchestrator's. Stop anything you start.
- In a fresh worktree run `npx next typegen` before `npx tsc --noEmit`.
- `--update-snapshots` only for the ROCKER desktop picture, only in Task 3, only with `-g "ROCKER" --project=desktop`.
- Sibling tasks are in flight: 261018-dvu (lib/geometry, components/rocker/blank-flag.tsx), 261018-dw6 (fins, lib/models/design-snapshot.ts), 261018-e6w (components/outline/*). Touch none of their files. The only shared place is the folder `e2e/desktop-baseline.spec.ts-snapshots/` — this task re-records `rocker-desktop-desktop-darwin.png` and nothing else; do not edit `e2e/desktop-baseline.spec.ts` itself.
- A later task restyles the `TEMPLATE details are imported` line in the same INPUTS block — leave that line exactly as it is.
- Commit each task with a plain-English subject (examples below). Write the SUMMARY in plain English for shapers and leave it uncommitted, as the sibling tasks do.
</context>

<tasks>

<task type="tracer">
  <name>Task 1: ROCKER's Center Thickness is a slider only — from the slider to the board's one centre, proven in the browser</name>
  <files>components/rocker/rocker-controls.tsx, components/rocker/rocker-live-controls.ts, components/design/slider-row.test.ts, e2e/helpers/blank-picker.ts, e2e/rocker-panel.spec.ts, e2e/rocker-live-controls.spec.ts, e2e/rocker-blanks.spec.ts, e2e/blank-makers.spec.ts, e2e/app-settings.spec.ts, e2e/touch-sizing.spec.ts</files>
  <read_first>components/rocker/rocker-controls.tsx (lines 10-17, 74-112, 192-215, 400-454), components/design/slider-row.tsx, components/design/slider-row.test.ts (43-74), e2e/helpers/blank-picker.ts, e2e/rocker-live-controls.spec.ts (1-160, 230-305), e2e/rocker-blanks.spec.ts (100-120, 185-205, 265-285), e2e/rocker-panel.spec.ts (1-12, 40-75, 132-150), e2e/blank-makers.spec.ts (158-170, 255-270), e2e/app-settings.spec.ts (222-250), e2e/touch-sizing.spec.ts (97-150), e2e/phone-chrome.spec.ts (389-395, the React-ownership poll)</read_first>
  <action>
Implements R1 (the founder: "center thickness on rocker page doesn't need a type in box, just the slider") under the orchestrator's rulings.

The component (rocker-controls.tsx):
1. In the INPUTS block, replace the whole hand-rolled Center Thickness row — the wrapper div that dimmed itself on a locked board, the label line with the typed field beside it, and the raw slider beneath — with ONE `SliderRow`, inside the SAME `<Live on={live.center}>` wrapper (unchanged: live on VIEWER and DATASHEET, inert on TOP VIEW, per quick 261006-v20 D-01/D-02). Its props: `label` is `Center Thickness — ` followed by `formatMark(foil.center, system)` (exactly the `ThicknessRow` pattern, so it reads `Center Thickness — 2 1/2"` and `Center Thickness — 64 mm`; Center Thickness stays a mark, the family the old box used); `value`/`min`/`max`/`step` from the existing `centerSlider`; `onValueChange={(v) => onChangeFoil({ center: centerSlider.toMm(v) })}`; `sliderLabel="Center Thickness"` (so the thumb is a slider named Center Thickness for a screen reader and for the tests); `sliderValueText` = the same `formatMark` string. SliderRow reads the lock and dims itself, so no separate lock dimming is needed here.
2. Remove what is now unused: the typed measure field import, the raw slider primitive import, the value-reading helper from the slider-row import (keep `SliderRow`), the typed-field bounds function from the measure-display import, and the `centerFieldBounds` constant. Everything else in the file is untouched — in particular the INPUTS heading and the TEMPLATE details line stay byte-for-byte as they are (a later task restyles that line).
3. Rewrite the header doc's INPUTS paragraph (lines 10-17): Center Thickness is one `SliderRow` with its value in its label (quick 261018-ejc, the founder 2026-10-18: "doesn't need a type in box, just the slider"); an exact centre is typed in the DATASHEET table's Center cell; ROCKER no longer needs an entry in slider-row.test.ts's allowlist. Keep the rest of that paragraph's facts (one centre shared with RAILS and VOLUME, re-judges the blank list, never clears the pick).
4. rocker-live-controls.ts: comments only — line 9 ("INPUTS' typed box and slider") and line 35 now say INPUTS' Center Thickness slider. No logic change; its unit test stays as it is.

The source contract (slider-row.test.ts): delete the ROCKER entry from `ALLOWLIST`. The existing "every remaining direct render … is named in the allowlist" test then demands zero raw slider renders in rocker-controls.tsx — that is the proof the box-and-raw-slider shape is gone.

The shared browser helpers (e2e/helpers/blank-picker.ts), each with a one-line JSDoc:
- `centerThicknessSlider(page)`: the slider named "Center Thickness" (exact) inside `[data-rocker-inputs]`.
- `nudgeCenterThickness(page, sixteenths, expected)`: waits until React owns the slider's range input (poll for a `__reactFiber` key, as phone-chrome.spec.ts does, so no key press is lost before hydration), focuses it, presses ArrowRight that many times (ArrowLeft for a negative count), then expects `[data-rocker-inputs]` to show the exact text `Center Thickness — {expected}`. Its JSDoc says one press is one 1/16" step in Imperial.

The specs — each keeps proving what it proved:
- e2e/rocker-panel.spec.ts: in the no-blank computer test, the textbox line becomes: INPUTS shows the exact text `Center Thickness — 2 1/2"`; INPUTS has no textbox at all (count 0); `sliderNamed(page, "Center Thickness")` has count 1 (the existing one-thumb count in INPUTS stays). In the Metric test add: INPUTS shows the exact text `Center Thickness — 64 mm`. Update the header comment (lines 9-10) from "box and slider" to "slider, its value in its label".
- e2e/rocker-live-controls.spec.ts: delete `CENTER_BOX`. Every live/inert check of the box becomes the same check on `CENTER_SLIDER` (where the slider is already checked on the next line, just drop the box line). In "with a blank, DATASHEET leaves Center Thickness …", replace the typing with: focus `CENTER_SLIDER`, press ArrowRight 4 times, and expect the table's `Thickness — Center` textbox to have the value `2 3/4"`; then the other direction — fill that table cell with `3`, press Enter, and expect `[data-rocker-inputs]` to show the exact text `Center Thickness — 3"`. Update header comment lines 12 and 19 (box → slider; the table cell is the typed way in).
- e2e/rocker-blanks.spec.ts: delete the local typing helper; `raiseCenterThickness` becomes `nudgeCenterThickness(page, 16, '3 1/2"')` (same 3 1/2" as before, so the pick still stops fitting); the RAILS test drives `nudgeCenterThickness(page, 4, '2 3/4"')`, is retitled "Center Thickness is the board's one centre — RAILS reads the slider's value", and its RAILS assertion stays word for word.
- e2e/blank-makers.spec.ts: delete the local typing helper; ~line 264 becomes `nudgeCenterThickness(page, 16, '3 1/2"')`.
- e2e/app-settings.spec.ts (~239): instead of typing 5, focus `centerThicknessSlider(page)` (after the same React-ownership wait), press End, and expect `[data-rocker-inputs]` to show `Center Thickness — 5"` — the slider's top, exactly the value the test typed. Everything after it is unchanged.
- e2e/touch-sizing.spec.ts: the generated "every visible typed measure field is at least 44px tall with 16px text" test no longer has a field to measure on /design/rocker — guard it so it is generated for TEMPLATE and VOLUME only, and update the comment above the loop (~104-107): ROCKER's only typed fields are now the DATASHEET's cells, which the ROCKER-only test further down already measures at 44 px and 16 px. The slider-thumb and button loops keep running on ROCKER.

Commit: `feat(quick-261018-ejc): ROCKER's Center Thickness is a slider only — an exact centre is typed on the DATASHEET` (run the verify first; the gate compares against HEAD).
  </action>
  <verify>
    <automated>npx vitest run components/design/slider-row.test.ts components/design/board-lock-scope.test.ts components/rocker/rocker-live-controls.test.ts lib/units-isolation.test.ts && npx next typegen && npx tsc --noEmit && npx eslint components/rocker/rocker-controls.tsx components/rocker/rocker-live-controls.ts e2e/helpers/blank-picker.ts e2e/rocker-panel.spec.ts e2e/rocker-live-controls.spec.ts e2e/rocker-blanks.spec.ts e2e/blank-makers.spec.ts e2e/app-settings.spec.ts e2e/touch-sizing.spec.ts && git diff --quiet HEAD -- components/design/measure-field.tsx components/design/slider-row.tsx && test "$(git diff HEAD -- components/rocker/rocker-controls.tsx | grep -E '^[-+]' | grep -c 'keepFiguresTogether(templateLine)')" = "0" && PW_PORT=3163 IS_WEBPACK_TEST=1 npx playwright test e2e/rocker-panel.spec.ts e2e/rocker-live-controls.spec.ts && PW_PORT=3163 IS_WEBPACK_TEST=1 npx playwright test e2e/rocker-blanks.spec.ts e2e/blank-makers.spec.ts e2e/app-settings.spec.ts -g "Center Thickness|stops fitting|stays on the board when its maker|Change Fit Rules" && PW_PORT=3163 IS_WEBPACK_TEST=1 npx playwright test e2e/touch-sizing.spec.ts --project=iphone --project=android -g "rocker|ROCKER"</automated>
  </verify>
  <done>INPUTS shows `Center Thickness — 2 1/2"` (Metric `64 mm`) over one slider named Center Thickness and no box; it is live on VIEWER and DATASHEET, inert on TOP VIEW; moving it changes the DATASHEET's Center cell and RAILS, and typing the Center cell moves its label. slider-row.test.ts has no ROCKER entry and passes. measure-field.tsx, slider-row.tsx and the TEMPLATE details line are unchanged. The listed specs pass on every project they run on. One commit.</done>
</task>

<task type="auto" tdd="true">
  <name>Task 2: The blank makers' catalogue note moves to the foot of ROCKER's DATASHEET and of the PICK A BLANK popup</name>
  <files>components/rocker/rocker-datasheet.tsx, components/rocker/blank-picker-dialog.tsx, components/rocker/blank-picker.tsx, lib/blanks/vendors.ts, lib/blanks/vendors.test.ts, e2e/rocker-blanks.spec.ts</files>
  <read_first>components/rocker/rocker-datasheet.tsx (1-45 header and imports, 255-265 the sheet's column, 385-416 the footnotes), components/rocker/blank-picker-dialog.tsx (1-40 header doc, 41-60 imports, 85-110 the size classes, 300-415 the header, filter bar and the scrolling column `data-blank-picker-scroll`), components/rocker/blank-picker.tsx (16-30, 41-62, 252-341), lib/blanks/vendors.ts (22-32), lib/blanks/vendors.test.ts (100-115), e2e/rocker-blanks.spec.ts (1-16, 170-185), e2e/rocker-live-controls.spec.ts (44-56, the sideways iPhone constant to copy)</read_first>
  <behavior>
    - On ROCKER, with no blank and with one picked, the sidebar (`aside`) holds no `[data-blank-catalog-note]`, on VIEWER and on DATASHEET.
    - On VIEWER with the popup closed the note is not on the page at all (the DATASHEET is not mounted, the popup is shut).
    - On the DATASHEET tab there is exactly one `[data-blank-catalog-note]`, inside `main`, its text exactly `BLANK_CATALOG_NOTE`, and it is the sheet's last element (no next element sibling) — with no blank, and again after a blank is picked (pick from VIEWER: the BLANK section is inert on DATASHEET).
    - With the PICK A BLANK popup open (from VIEWER) there is exactly one `[data-blank-catalog-note]` inside the popup, its text exactly `BLANK_CATALOG_NOTE`, and it is the last child of `[data-blank-picker-scroll]`, below every card group — with no blank and with one picked.
    - On an upright phone (the iphone and android projects) and on a sideways iPhone at 844 x 340: scrolled to the end of `[data-blank-picker-scroll]`, the note lies wholly inside the window, its top is at or below the last card group's bottom (under the grid, never beside it), and the popup's ✕ (the button named Close) lies wholly inside the window.
  </behavior>
  <action>
Implements R2 (the founder: the catalogue note "can be on the dimensions tab rather than in the controls taking up space"; "the dimensions tab" is ROCKER's DATASHEET tab, per the orchestrator's ruling) and the founder's ruling of 2026-10-18 that the same note ALSO sits at the foot of the PICK A BLANK popup, where the maker names and catalogue sizes show. The sidebar copy goes.

RED first: rewrite rocker-blanks.spec.ts's "the founder's catalog note ends the picker once …" test to the behaviour above, retitled "the founder's catalog note sits at the foot of the DATASHEET and of the Pick a Blank popup, with no blank and with one picked, and nowhere in the sidebar (quick 261018-ejc)". Switch tabs with `page.getByRole("tab", { name, exact: true })`; open and close the popup with the shared `openBlankPicker` / `closeBlankPicker`. Put the popup checks (one note, exact text, last child of the scrolling column, below the last card group, then scroll that column to its end and check the note and the ✕ lie inside `page.viewportSize()`) in one local function the test calls in both states — the test runs on all three projects, so the upright iPhone and Pixel 7 are covered by it. Add one more describe in the same file for a phone held sideways: `test.use` with the iPhone 14 landscape device and a viewport of 844 x 340 (the page Safari leaves; build it as rocker-live-controls.spec.ts builds its sideways iPhone, adding `devices` to the Playwright import), skipped unless the project is `iphone`, titled "the founder's catalog note at the foot of the Pick a Blank popup on a phone held sideways (quick 261018-ejc)", which opens ROCKER, opens the popup and calls the same function. Both titles contain "catalog note", which the verify filters on. Run them and see them fail.

Then:
1. rocker-datasheet.tsx: import `BLANK_CATALOG_NOTE` from `@/lib/blanks/vendors` (a constants-only module, safe in a client component). As the LAST child of the sheet's scrolling column — after the blank-only footnote block — render one paragraph with `data-blank-catalog-note`, the sidebar's exact look (`text-[11px] leading-snug text-surf-ink-muted`) and the constant as its text, in BOTH states. Planner's choice P-1 (the founder confirmed it stands): shown with no blank too. Add to the header doc's "Under the table: …" sentence: and last, in both states, the makers' catalogue note (moved from the sidebar, quick 261018-ejc).
2. blank-picker-dialog.tsx: add `BLANK_CATALOG_NOTE` to the existing `@/lib/blanks/vendors` import. As the LAST child of the scrolling column (`data-blank-picker-scroll`) — after the card groups, so after the empty-list, thin-list and no-match messages too — render one paragraph with `data-blank-catalog-note`, the same classes and the constant as its text, in every state of the list. It goes nowhere else in the popup: not in the fixed header beside the ✕, not in the filter bar, not inside a card group's grid — appended to the scroll it only lengthens the scroll, so the ✕ and the filter bar keep their place and the grid keeps its full width on every screen. No phone-specific classes are needed: the column already carries the phone paddings. Add a sentence to the header doc's "What it shows (D-07)" paragraph: last, at the foot of the list, the makers' catalogue note (the founder, 2026-10-18, quick 261018-ejc). The "catalog didn't load" popup in blank-picker.tsx shows no catalogue figures and does not get the note.
3. blank-picker.tsx: delete the `BlankCatalogNote` function and its render at the end of `BlankPicker`; drop `BLANK_CATALOG_NOTE` from the vendors import (keep `blankMakersNote` and `catalogsPhrase`). The "Showing … only" makers note stays exactly where it is. In the header doc, replace "and last, in every state, the founder's catalog note" with a line saying that note now sits at the foot of the DATASHEET and of the PICK A BLANK popup (quick 261018-ejc).
4. lib/blanks/vendors.ts: comment only — "The note at the end of ROCKER's blank picker" becomes "The note at the foot of ROCKER's DATASHEET and of the PICK A BLANK popup (moved from the sidebar, quick 261018-ejc)". The sentence itself does not change by a character (vendors.test.ts pins it).
5. lib/blanks/vendors.test.ts: the describe title becomes "the catalog note at the foot of ROCKER's DATASHEET and the Pick a Blank popup (quick 261006-fom, D-05; moved by quick 261018-ejc)"; its assertions stay as they are.

Nothing else gets the note (the printed pages and the Summary never had it).

Commit: `feat(quick-261018-ejc): the blank makers' catalogue note moves to the foot of the DATASHEET and the Pick a Blank popup`.
  </action>
  <verify>
    <automated>npx vitest run lib/blanks/vendors.test.ts lib/units-isolation.test.ts components/design/board-lock-scope.test.ts && npx tsc --noEmit && npx eslint components/rocker/rocker-datasheet.tsx components/rocker/blank-picker-dialog.tsx components/rocker/blank-picker.tsx lib/blanks/vendors.ts lib/blanks/vendors.test.ts e2e/rocker-blanks.spec.ts && PW_PORT=3163 IS_WEBPACK_TEST=1 npx playwright test e2e/rocker-blanks.spec.ts -g "catalog note" && PW_PORT=3163 IS_WEBPACK_TEST=1 npx playwright test e2e/phone-rails.spec.ts -g "DATASHEET" && PW_PORT=3163 IS_WEBPACK_TEST=1 npx playwright test e2e/blank-picker.spec.ts && PW_PORT=3163 IS_WEBPACK_TEST=1 npx playwright test e2e/touch-sizing.spec.ts -g "ROCKER"</automated>
  </verify>
  <done>The note is the DATASHEET's last paragraph and the last thing in the PICK A BLANK popup's scrolling list, on all three projects and on a sideways iPhone, word for word, with and without a blank; scrolled to the end it is on screen with the popup's ✕ still on screen; the sidebar has none; the DATASHEET still scrolls sideways on a phone as before; the popup's own browser tests still pass. One commit.</done>
</task>

<task type="auto" tdd="true">
  <name>Task 3: Remove This Blank asks first — a small popup with the sentence, Cancel and Remove Blank</name>
  <files>components/rocker/remove-blank-dialog.tsx, components/rocker/blank-picker.tsx, components/design/board-lock-scope.test.ts, e2e/helpers/blank-picker.ts, e2e/rocker-remove-blank.spec.ts, e2e/rocker-blanks.spec.ts, e2e/rocker-cut.spec.ts, e2e/rocker-custom.spec.ts, e2e/phone-screen-tiles.spec.ts, e2e/desktop-baseline.spec.ts-snapshots/rocker-desktop-desktop-darwin.png</files>
  <read_first>components/outline/wing-dial-in-dialog.tsx, components/ui/dialog.tsx (DialogContent, DialogFooter), components/app-settings-dialog.tsx (174-193), components/rocker/blank-picker.tsx (as left by Task 2), components/design/board-lock-scope.test.ts (14-30, 113-126), e2e/rocker-live-controls.spec.ts (31-56, 321-349), e2e/rocker-blanks.spec.ts (136-145, 478-510), e2e/rocker-cut.spec.ts (1-13, 167-190), e2e/rocker-custom.spec.ts (1-17, 495-506), e2e/phone-screen-tiles.spec.ts (1-12, 278-285, 370-378)</read_first>
  <behavior>
    - Computer: with a blank picked, the sidebar has no "Removing it keeps …" sentence. Remove This Blank opens a dialog named `Remove this blank?` showing exactly "Removing it keeps the rocker and foil at the five stations and re-draws the curve through them, for you to set by hand." and exactly two buttons, Cancel and Remove Blank.
    - Cancel closes it, the blank stays (the BLANK button still carries its name) and focus is back on Remove This Blank. Esc does the same.
    - Remove Blank closes it and removes the blank: the BLANK button reads Pick a Blank, "Hand-set until you pick a blank" shows, and focus is on the BLANK button. One undo (Ctrl/Cmd+Z) brings the same blank back.
    - Upright iPhone 14 and Pixel 7 (their projects), a sideways iPhone at 844 x 340, a sideways Pixel 7: the dialog's box lies wholly inside the window, both buttons are inside it and at least 44 tall, and Remove Blank removes the blank.
  </behavior>
  <action>
Implements R3 (the founder: the sentence "can turn into a popup after clicking remove blank rather than taking up room on the controls") under the orchestrator's rulings: title like "Remove this blank?", the sentence, Cancel and Remove Blank, removal only on confirm, Esc cancels, focus returns to the link, locked boards behave as today, fits a phone upright and sideways.

RED first: write e2e/rocker-remove-blank.spec.ts (header JSDoc quoting the founder and listing what it proves) and the two helpers below, run its desktop test, see it fail.
- Spec layout: copy `dismissChrome` and the two sideways device constants from rocker-live-controls.spec.ts, but build the sideways iPhone at viewport 844 x 340 (the page Safari leaves on a real iPhone on its side, per CLAUDE.md — stricter than 390). One computer describe (skip unless project `desktop`) with the Cancel/Esc test and the Remove Blank + undo test; one upright-phone describe (skip `desktop`); one sideways-iPhone describe (`test.use`, skip unless `iphone`); one sideways-Pixel-7 describe (`test.use` Pixel 7 landscape, skip unless `android`). The three phone describes share one function: open ROCKER, pick the first fitting blank, open the popup, check its bounding box against `page.viewportSize()` (left and top at least 0, right and bottom at most the window's width and height), both buttons inside it and at least 44 tall, then Remove Blank removes the blank. Write the sentence and the four labels out literally (spec files import from lib/, never from components/). Undo on the computer is `ControlOrMeta+z`.
- Helpers in e2e/helpers/blank-picker.ts: `removeBlankDialog(page)` = the dialog named "Remove this blank?"; `removeThisBlank(page)` = click the button named exactly "Remove This Blank", wait for that dialog, click its button named exactly "Remove Blank", wait for the dialog to go and for `pickedCard(page)` to have count 0.

Then build:
1. New file components/rocker/remove-blank-dialog.tsx ("use client"), exporting `RemoveBlankDialog({ open, onOpenChange, onConfirm, finalFocus })` with `finalFocus` typed as `DialogContent`'s own `finalFocus` prop. It is the WingDialInDialog shape: a controlled `Dialog`; `DialogContent` with `data-remove-blank-dialog`, `showCloseButton={false}` (two buttons only, as ruled), the given `finalFocus`, and exactly the wing popup's content classes (`border-surf-line-faint bg-surf-panel text-surf-ink sm:max-w-sm`); `DialogHeader` with `DialogTitle` (`text-surf-ink`) "Remove this blank?" and `DialogDescription` carrying the sentence exactly as the sidebar printed it; `DialogFooter` with, DOM-first, a `DialogClose` rendering an outline `Button` (type button, `data-lock-exempt`) reading "Cancel" — first, so it takes the focus when the popup opens and an Enter never removes by accident — then a `Button` (type button, `disabled={locked}` from `useControlsLocked()`, the wing popup's accent primary classes) reading "Remove Blank" whose click calls `onConfirm`. Planner's choices P-3/P-4, confirmed by the founder 2026-10-18: Cancel outline and Remove Blank in the accent fill, as on the wing popup (not the red "destructive" look: one undo brings a removed blank back); the shared dialog already sizes itself for phones (`max-w-[calc(100%-2rem)]`, `sm:max-w-sm`, the footer stacks below 640 dots and sits in a row above) and its Buttons grow to 44 dots on a finger (`coarse:h-11`), so no phone-specific classes are needed. Header JSDoc: the founder's words, what Cancel / Esc / a click outside do (nothing), the focus rules, and that no number appears in it (Rule 2 untouched).
2. blank-picker.tsx, in `BlankPicker`: add the popup's open state, a ref on the Remove This Blank button, and a "removed" ref flag. The link keeps its look and `disabled={locked}`; its click now resets the flag and opens the popup instead of removing. Delete the muted sentence under the link — it lives in the popup now. Render `RemoveBlankDialog` once, OUTSIDE the blank-only block, so the removal can never unmount it mid-close. `onConfirm` sets the flag, calls `removeBlank()` and closes the popup. `finalFocus` is a named function declared in the component, the `initialFocus` precedent in app-settings-dialog.tsx: after a removal it returns the BLANK button (`buttonRef.current`, which now reads Pick a Blank — planner's choice P-2, confirmed by the founder, since the link has gone); otherwise the Remove This Blank link. Update the header doc (lines 16-21 and 29-30): Remove This Blank opens a confirm popup (`remove-blank-dialog.tsx`, quick 261018-ejc) and only its Remove Blank clears the pick.
3. components/design/board-lock-scope.test.ts: add `components/rocker/remove-blank-dialog.tsx` to `LOCKABLE_FILES` with a one-line comment (quick 261018-ejc: the Remove This Blank popup) — its Cancel is marked view-only and its Remove Blank is tied to the lock.
4. Call sites: replace each click on Remove This Blank with `await removeThisBlank(page)` (adding the import) in rocker-blanks.spec.ts (~141 and ~498), rocker-cut.spec.ts (~179), rocker-custom.spec.ts (~503) and phone-screen-tiles.spec.ts (~281 and ~374). Every assertion after each call stays exactly as it is. Leave board-lock-screens.spec.ts, touch-sizing.spec.ts (:307) and rocker-live-controls.spec.ts's link checks alone — the link is still there, still disabled on a locked board.
5. The ROCKER desktop picture — the only baseline this task changes (Tasks 1 and 2 changed its sidebar: the Center Thickness row and the missing catalogue note; neither popup is open in that picture, so the popup's new note draws nothing there). Check port 3163 is free, then `PW_PORT=3163 IS_WEBPACK_TEST=1 npx playwright test e2e/desktop-baseline.spec.ts --project=desktop -g "ROCKER" --update-snapshots`. Open the new e2e/desktop-baseline.spec.ts-snapshots/rocker-desktop-desktop-darwin.png with Read and confirm by eye: INPUTS reads `Center Thickness — 2 1/2"` over a slider with no box, and the BLANK section ends with its Pick a Blank button and no catalogue note; nothing else in the picture looks different. `git status --porcelain e2e/desktop-baseline.spec.ts-snapshots` must list exactly that one file. Then run the whole desktop-baseline spec WITHOUT updating: all five pass (TEMPLATE, RAILS, VOLUME and FINS byte-identical). Do not edit e2e/desktop-baseline.spec.ts.
6. Final sweep, in the background with its own EXIT line, read in a separate call: `npx vitest run`, `npx tsc --noEmit`, `npm run lint`, then `PW_PORT=3163 IS_WEBPACK_TEST=1 npx playwright test` over e2e/rocker-remove-blank, rocker-blanks, blank-picker, rocker-live-controls, rocker-panel, rocker-cut, rocker-custom, phone-screen-tiles, app-settings, blank-makers, touch-sizing, board-lock-screens, phone-chrome, phone-rails and desktop-baseline (all projects). Fix anything red; never weaken an assertion to pass.
7. Write .planning/quick/261018-ejc-rocker-sidebar-tidy-center-thickness-sli/261018-ejc-SUMMARY.md in plain English for the founder (what changed on the ROCKER screen, the confirm popup's exact wording, the note's two new places, the planner's choices P-1 to P-4 as the founder confirmed them, that no board number changed, the one re-recorded picture, the test count). Leave it uncommitted.

Commit (code, tests and the one picture): `feat(quick-261018-ejc): Remove This Blank asks first, in a small popup with Cancel and Remove Blank`.
  </action>
  <verify>
    <automated>npx vitest run components/design/board-lock-scope.test.ts lib/units-isolation.test.ts && npx tsc --noEmit && npx eslint components/rocker/remove-blank-dialog.tsx components/rocker/blank-picker.tsx e2e/helpers/blank-picker.ts e2e/rocker-remove-blank.spec.ts e2e/rocker-blanks.spec.ts e2e/rocker-cut.spec.ts e2e/rocker-custom.spec.ts e2e/phone-screen-tiles.spec.ts && test "$(git status --porcelain e2e/desktop-baseline.spec.ts-snapshots | wc -l | tr -d ' ')" = "1" && git status --porcelain e2e/desktop-baseline.spec.ts-snapshots | grep -q 'rocker-desktop-desktop-darwin.png' && PW_PORT=3163 IS_WEBPACK_TEST=1 npx playwright test e2e/rocker-remove-blank.spec.ts e2e/rocker-cut.spec.ts e2e/rocker-custom.spec.ts e2e/phone-screen-tiles.spec.ts && PW_PORT=3163 IS_WEBPACK_TEST=1 npx playwright test e2e/rocker-blanks.spec.ts -g "Remove This Blank|stops fitting" && PW_PORT=3163 IS_WEBPACK_TEST=1 npx playwright test e2e/board-lock-screens.spec.ts -g "s-rocker" && PW_PORT=3163 IS_WEBPACK_TEST=1 npx playwright test e2e/desktop-baseline.spec.ts --project=desktop</automated>
  </verify>
  <done>The popup opens from Remove This Blank with the founder's sentence, Cancel and Remove Blank; only Remove Blank removes the blank, Cancel and Esc keep it and return focus to the link, focus lands on Pick a Blank after a removal, one undo restores it; it fits both phones upright and sideways with 44-dot buttons; the lock inventory includes the new file; every former Remove call site goes through the helper; only rocker-desktop.png changed and all five desktop pictures pass; the final sweep is green; the SUMMARY is written. One commit.</done>
</task>

</tasks>

<threat_model>
## Trust Boundaries

| Boundary | Description |
|----------|-------------|
| shaper's tap → design store | A sidebar control or the new popup button changes the board through the store's own actions (`updateFoil`, `removeBlank`); the store's lock guard is the real guard, the disabled control is what the shaper sees. No new data crosses any network or storage boundary; nothing is saved differently. |

## STRIDE Threat Register

| Threat ID | Category | Component | Severity | Disposition | Mitigation Plan |
|-----------|----------|-----------|----------|-------------|-----------------|
| T-ejc-01 | Tampering (a locked board changed) | `remove-blank-dialog.tsx` Remove Blank; `rocker-controls.tsx` Center Thickness slider | medium | mitigate | Remove Blank is `disabled={locked}` and the file joins `LOCKABLE_FILES` in board-lock-scope.test.ts; the link that opens the popup stays `disabled={locked}`; `SliderRow` reads the lock itself (board-lock-scope's "the two shared rows read the lock" test); board-lock-screens s-rocker still proves the screen greyed. |
| T-ejc-02 | Tampering (integrity of a shaper's numbers — a blank removed by a stray tap) | `blank-picker.tsx` Remove This Blank | low | mitigate | Removal now needs a second, deliberate tap on Remove Blank; Cancel is DOM-first and takes the focus; Esc and Cancel change nothing (proved in rocker-remove-blank.spec.ts); one undo still restores the blank (rocker-blanks, rocker-cut). |
| T-ejc-03 | Tampering (the centre committed wrong) | Center Thickness slider conversion | low | mitigate | The slider commits through the same `centerSlider.toMm` (`measureSlider`, Rule 2) the old raw slider used; rocker-live-controls proves slider → DATASHEET cell and cell → slider label; rocker-blanks proves RAILS reads it. |
| T-ejc-04 | Repudiation (the makers' "verify before you cut" and trademark notice less visible) | `rocker-datasheet.tsx`, `blank-picker-dialog.tsx` | low | mitigate | By the founder's ruling the note leaves the sidebar but sits word for word in the two places blank figures and maker names show: the DATASHEET (both states) and the foot of the PICK A BLANK popup (every state of its list); rocker-blanks' note test proves both, on all three projects and a sideways iPhone, and vendors.test.ts pins the sentence. |
</threat_model>

<verification>
- Unit: `npx vitest run` green (slider-row.test.ts with no ROCKER allowlist entry, board-lock-scope.test.ts with the new file, vendors.test.ts with the unchanged sentence, units-isolation.test.ts).
- Types and lint: `npx next typegen && npx tsc --noEmit`, `npm run lint`.
- Browser (always `PW_PORT=3163 IS_WEBPACK_TEST=1`): the new rocker-remove-blank spec on all three projects; every rewritten spec; board-lock-screens, phone-chrome and phone-rails unchanged and green; desktop-baseline 5/5 with only rocker-desktop.png re-recorded.
- Untouched: components/design/measure-field.tsx, components/design/slider-row.tsx, the TEMPLATE details line, every sibling task's file, e2e/desktop-baseline.spec.ts.
</verification>

<source_audit>
| Source | Item | Covered by |
|--------|------|------------|
| GOAL (founder 1) | Center Thickness: no typed box, just the slider | Task 1 |
| GOAL (founder 2) | Catalogue note onto the dimensions (DATASHEET) tab | Task 2 |
| FOUNDER RULING 2026-10-18 | The note ALSO at the foot of the PICK A BLANK popup; sidebar copy goes; P-1 to P-4 stand; checked on an upright iPhone and a sideways phone without pushing the ✕ off screen or squeezing the grid | Task 2 |
| GOAL (founder 3) | The removal sentence becomes a popup after Remove This Blank | Task 3 |
| REQ | QT-261018-ejc | Tasks 1-3 |
| RULING 1 | SliderRow with the value in the label; allowlist entry removed; Live/D-01 kept; DATASHEET Center cell stays typed and said so; MeasureField's other users untouched | Task 1 (+ objective, gates) |
| RULING 2 | Note under the DATASHEET table, small muted text; no other placement existed — the popup's is added by the founder's ruling | Task 2 |
| RULING 3 | "Remove this blank?", the sentence, Cancel / Remove Blank, confirm-only, Esc cancels, focus back to the link, locked as today, fits iPhone 14 upright and a sideways phone, existing Base UI dialog | Task 3 |
| RULING 4 | Every spec using the box or the link rewritten without weakening; baselines re-recorded by name | Tasks 1-3 (rocker-desktop.png only) |
| RULING 5-8 | Files disjoint from dvu/dw6/e6w; no `next dev` in main, ports 3163; no human-verify task; plain-English commits; TEMPLATE line untouched | context + every task |
| RESEARCH | none (quick task, no research phase) | — |
</source_audit>

<success_criteria>
- ROCKER's sidebar is shorter by the Center Thickness box, the catalogue note and the removal sentence; nothing on the board or in any saved design changes.
- The three founder requests are each visible on screen and each proven by a browser test.
- The planner's four choices (P-1 note in both states, P-2 focus to Pick a Blank after removal, P-3 Cancel outline / Remove Blank accent, P-4 no ✕ on the confirm popup) stand by the founder's ruling of 2026-10-18 and are recorded as such in the SUMMARY.
</success_criteria>

<output>
Write `.planning/quick/261018-ejc-rocker-sidebar-tidy-center-thickness-sli/261018-ejc-SUMMARY.md` (plain English, uncommitted) when done.
</output>
