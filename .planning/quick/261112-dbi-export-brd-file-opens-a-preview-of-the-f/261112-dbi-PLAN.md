---
phase: quick-261112-dbi
plan: 01
type: execute
wave: 1
depends_on: []
files_modified:
  - lib/export/brd-preview.ts
  - lib/export/brd-preview.test.ts
  - components/3d/export-cnc.ts
  - components/3d/brd-preview-dialog.tsx
  - components/3d/three-d-screen.tsx
  - components/3d/three-d-controls.tsx
  - components/3d/three-d-copy.ts
  - components/design/board-lock-scope.test.ts
  - e2e/three-d-export.spec.ts
  - e2e/board-lock-screens.spec.ts
  - CLAUDE.md
  - .planning/quick/261112-dbi-export-brd-file-opens-a-preview-of-the-f/pictures/
autonomous: true
requirements: [QT-261112-dbi]
estimate:
  # One executor, this worktree, three tasks: a pure module with its tests and a thin end-to-end dialog (tracer); the
  # whole dialog (three drawings, picking a slice, the facts and notes, phone layout); then the browser specs on three
  # projects (WebKit is slow on the dev server), the board-lock case, the 3D baseline and five pictures looked at.
  # Calibration: factor 1, 0 samples, so confidence is low.
  tokens: 190000
  raw_tokens: 190000
  tasks: 3
  confidence: low
must_haves:
  truths:
    - "Pressing Export .brd File on the 3D page opens a dialog titled \"Board file preview\" instead of downloading; nothing is downloaded until Save .brd File is pressed inside it (brief items 1, 4)."
    - "Everything the dialog draws and says is read back from the file's own bytes (unscrambleBrd then readBrdText), never from the screen's board, and the dialog says so in one line (brief item 1)."
    - "The dialog shows, stacked: TOP VIEW (the outline mirrored about a faint stringer, a line across the board at every slice as wide as the outline there), SLICE (the selected slice's whole cross-section from its Bezier knots, with a line naming it and where it stands from the tail), SIDE VIEW (bottom and deck along the stringer, an upright line at every slice) (brief item 2)."
    - "The top and side views each draw exactly as many slice lines as the file has cross-sections, and the done line's count is the same number (brief item 2, Rules)."
    - "A slice is picked by tapping or clicking in the top or side view, and stepped with the two arrow buttons and the left/right arrow keys; the dialog opens on the slice nearest the wide point (brief item 2)."
    - "Under the drawings: one facts line read from the file (slice count, the largest gap between neighbouring slices, length × width × thickness from p01/p04/p03 through units.ts), then the swallow and channels notes when they apply, then Cancel and Save .brd File (brief item 3)."
    - "Save .brd File downloads the very bytes the preview was drawn from, inside the tap with nothing awaited, closes the dialog and shows today's done line; Cancel, Escape and a click outside close it and save nothing (brief item 4)."
    - "On an upright phone and on a phone held sideways the dialog fills the screen, all three drawings can be reached, and Cancel and Save .brd File stay in view at 44 dots or more on a finger; the ‹ › buttons are 44-dot boxes too (brief item 5)."
    - "Every stroke and fill is a palette token from app/globals.css, so the dialog reads right in a light and a dark theme (brief item 6)."
    - "Every number shown goes through lib/geometry/units.ts (via measure-display): stations and gaps as dims, Imperial inches or Metric centimetres to one decimal (brief item 2, Rules)."
    - "The file's bytes are unchanged by this work: the bytes the dialog saves equal brdFile's for the same board (Rules)."
  artifacts:
    - path: "lib/export/brd-preview.ts"
      provides: "brdFileWithPreview (the file and the preview read back from its bytes), brdPreview (a read file sampled into polylines and slices, in mm), brdPreviewWords (the dims, stations and gap in the shaper's system), brdPreviewFrames (the three drawings laid out in screen dots, nose left) and brdSliceNearest"
      contains: "export function brdFileWithPreview"
    - path: "lib/export/brd-preview.test.ts"
      provides: "the preview's tests on the flat Shortboard, the Fish and the Deep Single Shortboard"
    - path: "components/3d/brd-preview-dialog.tsx"
      provides: "the Board file preview dialog"
      contains: "data-brd-preview"
    - path: "components/3d/three-d-copy.ts"
      provides: "the dialog's words"
      contains: "previewTitle"
  key_links:
    - from: "components/3d/three-d-screen.tsx onExport"
      to: "components/3d/export-cnc.ts makeBrdExport -> lib/export/brd-preview.ts brdFileWithPreview"
      via: "the Export tap builds the file and its preview and opens the dialog; nothing is downloaded there"
      pattern: "makeBrdExport\\("
    - from: "components/3d/brd-preview-dialog.tsx Save .brd File"
      to: "components/3d/export-cnc.ts saveBrdExport"
      via: "the Save tap downloads prepared.data — the same Uint8Array the preview was read from — synchronously"
      pattern: "saveBrdExport\\("
    - from: "lib/export/brd-preview.ts brdFileWithPreview"
      to: "lib/export/brd.ts brdFile + readBrdText, lib/export/brd-scramble.ts unscrambleBrd"
      via: "the preview is the file's own bytes read back"
      pattern: "unscrambleBrd\\("
---

<objective>
Export .brd File stops downloading straight away and opens a "Board file preview" first: the board from above with a
line across it at every slice, the selected slice drawn large, and the board from the side with an upright line at every
slice, all read back from the file's own bytes, so a shaper sees the slices are there, where they stand and that the
contour is in them before the file leaves the app. The file is saved from a Save .brd File button inside the dialog.

Purpose: the founder's ask (2026-11-12): "when saving a .brd file, could be show a preview like the top and side view of
Shape3D so the user can see the slices and trust the output?" Trust is the whole point: the drawings must come from the
file, not from the screen's board, so they cannot disagree with it.
Output: a pure, tested preview module in lib/export/, the dialog, the changed export flow, its words, browser proof on a
computer and both phones, and five pictures for the founder's look.
</objective>

<execution_context>
@$HOME/.claude/gsd-core/workflows/execute-plan.md
@$HOME/.claude/gsd-core/templates/summary.md
</execution_context>

<context>
@.planning/quick/261112-dbi-export-brd-file-opens-a-preview-of-the-f/BRIEF.md
@.planning/quick/261112-c2d-the-brd-export-leaves-channels-out/261112-c2d-SUMMARY.md
@CLAUDE.md

Load `Skill("sketch-findings-shaper")` before Task 2 (its references/drawing-and-callouts.md is the drafting grammar).

Facts gathered at plan time (read the files for detail; do not re-derive):

The file and its reader (`lib/export/brd.ts`, `lib/export/brd-scramble.ts`)
- `brdFile(surface, boardName, options)` returns `{ name, data, sectionCount }`; `sectionCount` counts the fitted
  cross-sections, not the two one-knot all-zero sections that close the tail (station 0) and the nose (station p01).
- `readBrdText(text)` returns `{ header, outline, bottom, deck, sections }`, every number in CENTIMETRES as written.
  `header` is `[key, value][]`: `p01` length, `p03` thickness (already the stringer's: the writer's `thickness` is the
  largest deck minus bottom along the stringer), `p04` full width (twice the widest half-width). `sections` includes the
  two one-knot ends; a fitted section has more than one knot (the e2e spec filters `knots.length > 1`).
- Coordinates: outline knots are (distance from the tail, half-width), x only rises, a swallow written square starts
  (0,0) to (0, half the points' width) as a corner. Bottom (`p33`) and deck (`p34`) knots are (distance from the tail,
  height); the deck is closed by corner knots at both tips. A section's knots are (half-width out from the stringer,
  height above the bottom AT THE STRINGER at that station): the first knot is (0,0), the last is (0, the stringer's
  thickness there); a concave goes below 0.
- `BrdReadKnot` (`point`, `before`, `after`, `smooth`) fits `BezierKnot` from `lib/geometry/bezier-fit.ts`, so
  `bezierPoint(a, b, t)` samples a span directly. `unscrambleBrd(data)` and `scrambleBrd` are pure and synchronous.
- Units: `centimetresToMm` in `lib/geometry/units.ts`; `formatDim`, `formatLength` in `lib/geometry/measure-display.ts`
  (dims: Imperial `28 1/2"` / feet-and-inches for length, Metric `72.4 cm`); `formatFeetInches`,
  `formatInchesFraction`, `formatCentimetres` in units.ts. `formatLengthByWidth` in `lib/geometry/summary-line.ts` is
  the pattern for a "×" dims line: each Imperial value carries its own mark, Metric carries `cm` once at the end.
  BOTTOM's stations read through `formatDim` (`formatBottomStation` in `lib/geometry/blank-reasons.ts`), so a slice's
  station does too. `THREE_D_COPY.tailRailFromTheTail(distance)` already reads `${distance} from the tail`.

Measured at plan time (a scratch script reading back `brdFile` for the phase16 fixtures `shortboard|asis|hard` and
`fish|asis|hard`, and the Shortboard with a Deep Single + 4 channels through `brdFileBottom`):
- Fitted slices: flat Shortboard 20, Fish 19, Deep Single 22 (the file's `sectionCount` each time).
- Largest gap between neighbouring sections: 10.16 cm (4") on all three, the same with or without the one-knot ends.
- Outline sampled at each slice's station vs the slice's own widest point: worst 0.24 mm. Deck minus bottom sampled at
  a station vs the slice's last knot height: worst 0.30 mm. Both comfortably inside the brief's 0.5 mm.
- Slice nearest half the length: Deep Single's lowest point 4.5 mm below its stringer bottom (6.35 mm at the deepest);
  the flat Shortboard's 0.1 mm (a Bezier undershoot). The opening slice (nearest the outline's widest knot) is slice 10
  of 20 on the flat Shortboard and 11 of 19 on the Fish.
- Side view at true height: about 11.5 to 12.5 cm tall over 173 to 188 cm long (the nose rocker plus the thickness).
- Sampling a polyline at a station can hit two segments when the station lands on a shared sample point (same value);
  take the first bracketing segment.

The page and the app's dialogs
- `components/3d/export-cnc.ts`: `exportBrd(surface, boardName, bottomStations)` builds with `brdFile` and downloads
  inside the tap through the private `download(name, data, type)` (Blob, object URL, hidden link, revoked a minute
  later). It is the only caller-facing .brd function; `three-d-screen.tsx` line ~471 is its only caller.
- `components/3d/three-d-screen.tsx`: `onExport` (lines ~451-477) builds the channel-less surface only when
  `brdFileBottom(bottom, bottomBoard) !== bottom`, then calls `exportBrd`, sets `{ kind: "done", fileName, sliceCount }`
  and on a throw logs `console.error("The board file could not be made:", error)` and sets `{ kind: "failed" }`.
  The controls get `exportSwallowNote={built.ok && brdTailWrittenSquare(built.surface)}` and
  `exportChannelsNote={built.ok && brdLeavesChannelsOut(bottom)}` (line ~1284). The canvas host has its own
  `onKeyDown` for arrow keys (it ignores events not aimed at the host itself).
- `components/3d/three-d-controls.tsx`: `ExportSection` draws the accent `Button` (`data-lock-exempt`), the note, the
  swallow and channels lines and the `role="status"` line; `ExportState` is idle | done | failed | cant-build.
- `components/rocker/blank-picker-dialog.tsx` exports `LARGE_DIALOG_CLASS` (32 dots in from each edge of a computer's
  window, at most 1180 wide, flex column, no padding, panel colours) and `FULL_SCREEN_CLASS` (the whole screen under
  `max-shell:` and under the inline `[@media(max-height:500px)]` rule, safe-area padding). `components/rocker/
  customize-rocker-dialog.tsx` is the pattern to copy: `DialogContent` with `showCloseButton={false}`,
  `finalFocus={buttonRef}`, `className={cn(LARGE_DIALOG_CLASS, FULL_SCREEN_CLASS)}`; a header row
  (`border-b border-surf-line-faint px-4 py-3`, phone and short-screen `px-3 py-2`) with the `DialogTitle` in
  `text-sm font-extrabold tracking-architectural text-surf-ink uppercase` and a `DialogDescription` in
  `text-xs text-surf-ink-muted`; a `min-h-0 flex-1` body; a pinned footer (`border-t`, Cancel first with `mr-auto`, the
  accent primary last, `FOOTER_BUTTON_CLASS = "inline-flex items-center coarse:min-h-11"`, `PRIMARY_CLASS` the accent).
  `Button` sizes already go to 44 dots on a coarse pointer (`default` coarse:h-11, `icon` coarse:size-11).
- Drawing grammar, as BOTTOM draws it (`components/bottom/bottom-top-view.tsx`, `bottom-section.tsx`): the picture is
  measured (`useSvgClientSize` from `components/viewer/callout-primitives.tsx`) and drawn in screen dots, nothing drawn
  until measured; board `fill="var(--outline-board-fill)"`, edge `stroke="var(--outline-ink)"` at 1.1 dots; faint
  lines `var(--outline-station-line)` at 1 dot; the stringer dash `var(--outline-stringer-dash)` (16 4 4 4), stations
  `var(--outline-station-dash)` (5 4); BOTTOM's cutting line — "the section below is taken here" — is
  `var(--outline-ink)` at 1.1 dots with `var(--outline-cut-dash)` (9 3 2 3). Caption rows above a drawing:
  `text-[10px] font-bold uppercase tracking-architectural text-surf-ink-muted`. App top views point the nose LEFT
  (BOTTOM: "nose left like ROCKER's top view"); ROCKER's side view is nose left too. ROCKER never stretches height:
  "User units per inch, shared by BOTH axes — a shaper checks a rocker line with a straightedge, so the drawing never
  exaggerates the vertical axis" (`components/rocker/rocker-view-frame.ts`).
- The board lock: `components/design/board-lock-scope.test.ts` reads every file in `LOCKABLE_FILES` and fails on any
  button that is neither tied to the lock nor `data-lock-exempt`. Exporting changes nothing, so every button in the new
  dialog is `data-lock-exempt` and the file joins that list.

Browser specs
- `e2e/three-d-export.spec.ts`: `exportFile(page)` clicks Export and waits for the download — every case downloads
  through it, so routing it through the dialog updates cases 1, 2, 4, 5, 7 at once. `expectWholeBrd` checks the name,
  the stamp, the strict read and the done line. Case 6 forces `URL.createObjectURL` to throw and expects the failed line
  in `text-surf-warning-ink` plus a console error containing "could not be made", then a retry. Cases 7 and 8 build
  Deep Single / channels bottoms with `presetBottom`. `setMetricUnits(page)` is in `e2e/helpers/guide.ts`.
- `e2e/board-lock-screens.spec.ts` case "x-3d" (line ~943) clicks Export inside `Promise.all` with the download, then
  expects the panel's innerText to be the old text plus the done line.
- Sideways phones: `e2e/rocker-custom.spec.ts` lines ~754-835 build a real sideways iPhone (844 × 390, from
  `devices["iPhone 14 landscape"]` with the viewport replaced) and `devices["Pixel 7 landscape"]`, each in its own
  describe with `test.use` and a project skip.
- Pictures recipe: `.planning/quick/261103-gcm-a-diamond-tail-s-litres-leave-out-the-v/pictures/shoot-source.tar.gz`
  (a `shots.config.ts` spreading the worktree's `playwright.config.ts` with `testDir` set to a scratch folder,
  `webServer.cwd` the worktree, `reuseExistingServer: true`; the spec sets the banner and toolbar-tip keys before load).
  The theme is `localStorage["shaper-theme"]` (`THEME_STORAGE_KEY` in `lib/theme.ts`): `"daylight"` light, `"slate"` dark.
</context>

<decisions_for_this_plan>
The brief's decisions (items 1-7 and the Rules) are locked. Where it left a choice, this plan makes it, and each is
named in the SUMMARY for the founder's pen:
- P-1 Nose LEFT in the top and side views (the app's way: BOTTOM's and ROCKER's top views and ROCKER's side view all
  point the nose left; the brief: "otherwise the app's way, not Shape3D's"). Slices are numbered from the tail, in the
  file's own order, so Slice 1 stands at the right; ‹ and the left arrow key move the marked slice LEFT (toward the
  nose), › and the right arrow key move it right. ‹ › are dimmed at the ends; no wrap.
- P-2 No stretch. ROCKER's convention is one scale for both axes, so the side view is drawn at true height and shares
  the top view's length scale: each slice's line in the top view stands exactly above its line in the side view. With
  nothing stretched, nothing is said about a stretch. The SLICE is true height too, at one scale for every slice (BOTTOM's
  "one scale for every station"), sized so the widest slice fills the width; stepping slices shows their real change.
- P-3 Slice lines: every slice in the station grammar (`--outline-station-line`, 1 dot, `--outline-station-dash`); the
  selected slice in BOTTOM's cutting-line grammar (`--outline-ink`, 1.1 dots, `--outline-cut-dash`), in both views. No
  text inside a board; the caption line names the slice.
- P-4 The SLICE marks the file's own knots on its right half with small dots (radius 2 dots, `--outline-ink` fill) —
  the points AkuShaper and Shape3D read — unnamed (no text inside the board).
- P-5 "Slices" are the fitted cross-sections (the done line's count already); the two one-knot ends close the tips and
  are not drawn as lines. The facts line's gap is the largest gap actually in the file between neighbouring sections,
  the tip ends included, as a dim (`4"`, `10.2 cm`).
- P-6 The dialog opens on the slice nearest the file's widest outline knot.
- P-7 A tap or click anywhere on the top or side view picks the slice nearest to it along the board (a dot-wide line is
  not something a finger can hit).
- P-8 Footer order is the app's: Cancel first (left), Save .brd File last in the accent (right). No ✕ in the header:
  Cancel is always in view in the pinned footer, and Escape and a click outside close it too.
- P-9 Size: the shared `LARGE_DIALOG_CLASS` + `FULL_SCREEN_CLASS`, never copied; the drawings sit in one column at most
  1000 dots wide, centred; header and footer pinned, the column between them scrolls when it must.
- P-10 A failure while making the file opens no dialog and shows the page's failed line (as today). A failure at Save
  closes the dialog and shows the failed line; pressing Export again is the retry.
</decisions_for_this_plan>

<tasks>

<task type="tracer" tdd="true">
  <name>Task 1: Tracer — Export opens a dialog drawn from the file's own bytes, and Save inside it downloads them</name>
  <files>lib/export/brd-preview.ts, lib/export/brd-preview.test.ts, components/3d/export-cnc.ts, components/3d/brd-preview-dialog.tsx, components/3d/three-d-screen.tsx, components/3d/three-d-controls.tsx, components/3d/three-d-copy.ts, e2e/three-d-export.spec.ts</files>
  <behavior>
    - brdFileWithPreview(surface, name, options) returns name, data and sectionCount equal to brdFile's for the same arguments (data byte for byte, compared with Buffer.equals), plus a preview read back from those bytes.
    - On the flat Shortboard, the Fish and the Deep Single Shortboard (Deep Single + 4 channels passed through brdFileBottom, as the page writes it): preview.slices.length equals sectionCount and equals the read file's sections with more than one knot.
    - Each slice's halfWidth (the file's outline sampled at its station) is within 0.5 mm of its reach (the widest point of its own sampled cross-section).
    - Each slice's deck minus bottom (the deck and bottom curves sampled at its station) is within 0.5 mm of its thickness (its last knot's height).
    - Every number in the preview (polylines, slices, length, width, thickness, widestGap) is finite; stations rise strictly from tail to nose.
    - The Deep Single's slice nearest half the length has a cross-section point more than 1 mm below its stringer bottom; the flat Shortboard's slice nearest half the length has none lower than 0.5 mm below.
    - length, width and thickness are centimetresToMm of the header's p01, p04 and p03; widestGap is the largest gap between neighbouring stations of every section in the file, the one-knot ends included, and is no more than inchesToMm(BRD_SECTION_SPACING_IN) plus 1e-6.
    - openingSlice is the index of the slice whose station is nearest the station of the outline's widest knot.
    - Browser (desktop): pressing Export opens the dialog, no download fires until Save .brd File is pressed, the top view shows as many slice lines as the downloaded file has fitted sections, and the done line follows.
  </behavior>
  <action>
RED first: write `lib/export/brd-preview.test.ts` from the behavior list, run it, see it fail on the missing module, then
implement. Build the three boards at module or describe scope, never inside an `it` (a fit takes seconds): copy
`flatSurface` and `cutSurface` from `lib/export/brd.test.ts` (fixtures `phase16Boards()` labels `shortboard|asis|hard`
and `fish|asis|hard`; the Deep Single board passes its bottom through `brdFileBottom` and its stations through
`brdBottomStations(resolveBottom(fileBottom, board))`, the way the page does). Type no geometry numbers; the only typed
figures are the brief's 0.5 mm and the plan's 1 mm dip cap (CLAUDE.md Rule 1).

Create `lib/export/brd-preview.ts` (pure: no React, browser or database import; relative imports like brd.ts; every
centimetre goes through `centimetresToMm`, never a bare 10 — CLAUDE.md Rule 1 and Rule 2):
- `brdFileWithPreview(surface, boardName, options)`: calls `brdFile`, then `brdPreview(readBrdText(unscrambleBrd(data)))`,
  and returns `{ name, data, sectionCount, preview }` with `data` the very array `brdFile` returned (brief item 1).
- `brdPreview(read: BrdRead): BrdPreview`, all lengths `Mm`: `length`, `width`, `thickness` from p01, p04, p03;
  `outline`, `bottom`, `deck` as polylines sampled from their knots with `bezierPoint` (about 24 points a span);
  `slices`, one per section with more than one knot, in file order, each with `number` (1-based from the tail),
  `station`, `halfWidth` (outline polyline at the station), `reach`, `bottom` and `deck` (those polylines at the
  station), `thickness` (last knot height), `section` (its right half sampled, about 16 points a span, (out, up) from
  the stringer bottom) and `knots` (its knot points); `widestGap`; `openingSlice` (P-6). A small helper takes y at x on a
  polyline from the first segment that brackets x. Throw a plain Error if the file has no fitted slice.
- `brdSliceNearest(preview, station)`: the index of the slice nearest a station (P-7).

In `components/3d/export-cnc.ts`, replace `exportBrd` with two functions (keep `download` and `exportForCnc` as they
are): `makeBrdExport(surface, boardName, bottomStations)` returns `brdFileWithPreview(surface, boardName, { bottomStations })`
and downloads nothing; `saveBrdExport(file)` calls `download(file.name, file.data, "application/octet-stream")` and
returns `{ fileName, sliceCount }`. Rewrite the doc comments in plain words: the Export tap makes the file and its
preview, and the dialog's Save tap starts the download synchronously, Safari's rule.

In `components/3d/three-d-copy.ts`, add the dialog's words right after `exportDone` (brief item 7, verbatim):
`previewTitle: "Board file preview"`, `previewFromFile: "Drawn from the file itself — these are the slices AkuShaper
and Shape3D will read."`, `previewTopView: "TOP VIEW"`, `previewSlice: "SLICE"`, `previewSideView: "SIDE VIEW"`,
`previewSave: "Save .brd File"`, `previewCancel: "Cancel"`, each with a one-line doc comment in the file's style.

Create `components/3d/brd-preview-dialog.tsx` ("use client"), first cut: a controlled `Dialog` whose `DialogContent`
carries `data-brd-preview`, `showCloseButton={false}`, `finalFocus` from a prop, and
`className={cn(LARGE_DIALOG_CLASS, FULL_SCREEN_CLASS)}` imported from `@/components/rocker/blank-picker-dialog`
(shared, never copied — P-9); a header with the `DialogTitle` and the `DialogDescription` line styled as
customize-rocker-dialog's; a scrolling body with the TOP VIEW caption and its drawing (`data-brd-preview-top`, the
board's outline mirrored as a filled path, one `line` per slice carrying `data-brd-slice={number}`, the opening slice
also `data-brd-slice-selected`) — a plain fit of the preview's polylines to the measured width is enough here, Task 2
moves the layout into lib; and a pinned footer with Cancel (`DialogClose`) and Save .brd File (accent), both
`data-lock-exempt`. Props: `prepared` (the brdFileWithPreview result or null), `onSave`, `onOpenChange`, `finalFocus`.

In `components/3d/three-d-screen.tsx`: `onExport` keeps its surface and stations logic exactly, but calls
`makeBrdExport` and stores the result (plus `swallowNote` and `channelsNote` worked out the way the controls' props are)
in a `useState` that opens the dialog; nothing is downloaded there. A new `onSaveBrd` calls `saveBrdExport(prepared)`
synchronously, sets the done line, and closes the dialog; any throw logs the existing "The board file could not be
made:" error, closes the dialog and sets the failed line (P-10). Escape, a click outside and Cancel just close it
(`onOpenChange(false)` clears the state; the status line keeps what it had). Render the dialog at the screen's top level
beside `DesignScreenShell` (wrap the return in a fragment), never inside the canvas host, so key presses in it never
reach the canvas. In `components/3d/three-d-controls.tsx`, let `ThreeDControls` take an `exportButtonRef` and hand it to
the Export `Button` as `ref`, so focus returns to it when the dialog closes; nothing on the panel changes visibly.

In `e2e/three-d-export.spec.ts`, route `exportFile(page)` through the dialog: click Export, expect
`[data-brd-preview]` visible with the title `THREE_D_COPY.previewTitle`, then `Promise.all` the download with a click on
the dialog's `THREE_D_COPY.previewSave` button, then expect the dialog gone. In case 1, before saving, keep the count of
`[data-brd-preview-top] [data-brd-slice]` and, after `expectWholeBrd`, expect it to equal the file's fitted sections.

Commit (plain English a shaper can read, ending with the line `Co-Authored-By: Claude <noreply@anthropic.com>`), e.g.
"Export .brd File now shows the board file before saving it — the slices drawn from the file itself, saved from a
button in the preview".
  </action>
  <verify>
    <automated>npx vitest run lib/export/brd-preview.test.ts && PW_PORT=3117 npx playwright test e2e/three-d-export.spec.ts --project=desktop -g "1\."</automated>
  </verify>
  <done>
- `lib/export/brd-preview.ts` exists with `brdFileWithPreview`, `brdPreview`, `brdSliceNearest`; its tests pass on all three boards, including the byte-for-byte check against `brdFile`.
- On the desktop project, case 1 passes through the dialog: no download until Save, as many top-view slice lines as the file's fitted sections, then the done line.
- Committed with a plain-English message.
  </done>
</task>

<task type="auto" tdd="true">
  <name>Task 2: The whole preview — the slice and the side view, picking a slice, the facts and the notes, on a computer and a phone</name>
  <files>lib/export/brd-preview.ts, lib/export/brd-preview.test.ts, components/3d/brd-preview-dialog.tsx, components/3d/three-d-copy.ts, components/3d/three-d-screen.tsx, components/design/board-lock-scope.test.ts</files>
  <behavior>
    - brdPreviewFrames(preview, widthDots) lays out the three drawings in screen dots for a box that wide: every point inside its drawing's box; a slice's x in the top view equals its x in the side view (one length scale, P-2); the nose is at the left (station 0 maps to the right end, station = length to the left end); the side view's height over its width equals the board's true height over its length within 1% once the padding is taken off (no stretch, P-2).
    - The slice frame for slice i is closed, mirrored about the stringer (each point's mirror is on the outline), uses one scale for every slice, and the widest slice spans the width less its padding; its knot dots sit on its right half.
    - stationAtX in a frame is the inverse of the station-to-x mapping (round trip within a millionth of a millimetre).
    - brdPreviewWords(preview, "imperial") gives dims `formatFeetInches(length) × formatInchesFraction(width) × formatInchesFraction(thickness)`, and "metric" gives the three `formatCentimetres` values joined by ` × ` with ` cm` once at the end; each station reads `formatDim(station, system)`; the gap reads `formatDim(widestGap, system)`. Each relation asserted against the units.ts functions, never a typed string.
  </behavior>
  <action>
Load `Skill("sketch-findings-shaper")` first (brief item 6). RED first for the lib additions, then implement.

In `lib/export/brd-preview.ts` add (pure, tested, in screen dots, the drawing formulas out of the component — CLAUDE.md
Rule 1):
- `brdPreviewFrames(preview, widthDots)`: one length scale for the top and side views (P-2) with small fixed paddings
  (around 10 dots at the ends, 8 above and below); nose left (P-1). `top`: height, the closed outline path's points
  (right half tail to nose, then the left half back), the stringer line, and per slice `{ x, y1, y2 }` spanning
  ±halfWidth. `side`: height, bottom and deck points (deck up), per slice `{ x, y1, y2 }` from bottom to deck. `slice(i)`:
  height (from the tallest and lowest reach of any slice, so the box never jumps while stepping), the closed mirrored
  outline points, the stringer line, the right half's knot points. `stationAtX(frame, x)`. Keep point lists as numbers so
  the component only joins them into path strings.
- `brdPreviewWords(preview, system)`: `{ dims, gap, stations }` as in the behavior list (dims: brief item 3; stations and
  gap: dims through `formatDim`, P-5).

In `components/3d/three-d-copy.ts` add, for the founder's pen: `previewSliceLine(n, count, distance)` reading
`Slice ${n} of ${count} · ${distance} from the tail` (brief item 2); `previewFacts(count, gap, dims)` reading
`${count} slices · none more than ${gap} apart · ${dims}` (brief item 3); `previewTowardNose: "Slice toward the nose"`
and `previewTowardTail: "Slice toward the tail"` (the ‹ › buttons' spoken names); and spoken names for the three
drawings (e.g. `previewTopName(count)`: "The board file from above, with its N slices"; `previewSliceName(n, count)`;
`previewSideName(count)`).

Finish `components/3d/brd-preview-dialog.tsx` (brief items 2, 3, 5, 6):
- Measure the drawing column's width (`useSvgClientSize`, as BOTTOM does) and draw nothing until it is measured; lay out
  with `brdPreviewFrames` (memoised on the preview and the width). The column is `mx-auto w-full max-w-[1000px]` (P-9).
- Three blocks stacked, each a caption row (`text-[10px] font-bold uppercase tracking-architectural
  text-surf-ink-muted`) over an `svg` with `role="img"` and its spoken name, viewBox in dots, height from its frame:
  TOP VIEW (`data-brd-preview-top`), then SLICE (`data-brd-preview-slice`, carrying `data-brd-preview-slice-at={number}`),
  then SIDE VIEW (`data-brd-preview-side`). Grammar per P-3 and P-4: board fill and 1.1-dot ink edge; the stringer
  dashed and faint; every slice line `data-brd-slice={number}` in station grammar; the selected one
  `data-brd-slice-selected` in cutting-line grammar; the side view's bottom and deck as ink lines with the slices'
  uprights between them; tokens only, never a colour value.
- The SLICE row's caption holds the ‹ and › buttons (`Button variant="outline" size="icon"`, lucide chevrons,
  aria-labels from the copy, `data-lock-exempt`, dimmed at the ends, P-1) around the line
  `THREE_D_COPY.previewSliceLine(number, count, words.stations[i])` in `data-brd-preview-slice-line`
  (`text-xs text-surf-ink`, `aria-live="polite"`).
- Picking (P-7): `onPointerDown` on the top and side views' boxes turns the pointer into a station through the svg's
  own screen matrix (`getScreenCTM().inverse()`, as `bottom-top-view.tsx` does) and `stationAtX`, then
  `brdSliceNearest`. `onKeyDown` on `DialogContent`: ArrowLeft steps toward the nose, ArrowRight toward the tail, then
  `preventDefault` and `stopPropagation`. The selected slice starts at `preview.openingSlice` and resets each opening
  (key the body on the prepared file).
- Under the drawings, inside the scrolling body: the facts line `data-brd-preview-facts`
  (`THREE_D_COPY.previewFacts(slices.length, words.gap, words.dims)`, `text-xs text-surf-ink`), then
  `THREE_D_COPY.exportSwallowNote` (`data-brd-preview-swallow`) and `THREE_D_COPY.exportChannelsNote`
  (`data-brd-preview-channels`) when the prepared file says they apply, in `text-xs text-surf-ink-muted`.
- Layout (brief item 5): header and footer `flex-none`, body `min-h-0 flex-1 overflow-y-auto`, so on an upright phone
  (`max-shell:`) and a short screen (`[@media(max-height:500px)]`) — both full-screen through `FULL_SCREEN_CLASS` — the
  drawings scroll and both buttons stay in view. Tighten the header, body and footer padding under both rules with the
  same values (customize-rocker-dialog's `px-3 py-2`). Footer buttons carry `FOOTER_BUTTON_CLASS` (44 dots on a finger);
  never a new phone variant, the pointer never picks a layout.

In `components/3d/three-d-screen.tsx`, pass the system (`useUnits`) only if the dialog cannot read it itself; keep the
screen's changes to wiring. In `components/design/board-lock-scope.test.ts`, add
`components/3d/brd-preview-dialog.tsx` to `LOCKABLE_FILES` with a one-line comment (quick 261112-dbi: the preview only
shows the file and saves it, so every button there is `data-lock-exempt`).

Then run `npx next typegen`, `npx tsc --noEmit`, `npm run lint` and fix what they raise. Look at the dialog yourself on
the desktop project once (a throwaway screenshot in your scratch folder) before committing; fix anything that reads
wrong. If the dev server rewrote AGENTS.md, leave that change out of the commit.

Commit (plain English, ending with `Co-Authored-By: Claude <noreply@anthropic.com>`), e.g. "The board file preview
draws the selected slice and the side view, steps through every slice, and lists what the file holds".
  </action>
  <verify>
    <automated>npx vitest run lib/export/brd-preview.test.ts components/design/board-lock-scope.test.ts && npx next typegen && npx tsc --noEmit && npm run lint && PW_PORT=3117 npx playwright test e2e/three-d-export.spec.ts --project=desktop -g "1\."</automated>
  </verify>
  <done>
- The dialog shows TOP VIEW, SLICE and SIDE VIEW stacked, nose left, slice lines in both views aligned one above the other, the selected slice marked, the slice line under the SLICE caption, the facts line and any notes, Cancel and Save .brd File pinned at the bottom.
- ‹ ›, the arrow keys and a tap or click in either view change the selected slice and its line.
- `brdPreviewFrames` and `brdPreviewWords` are tested; the board-lock inventory includes the dialog and passes; typegen, tsc and lint are clean.
- Committed with a plain-English message.
  </done>
</task>

<task type="auto">
  <name>Task 3: Browser proof on a computer and both phones, the locked board, the 3D baseline, five pictures looked at</name>
  <files>e2e/three-d-export.spec.ts, e2e/board-lock-screens.spec.ts, CLAUDE.md, .planning/quick/261112-dbi-export-brd-file-opens-a-preview-of-the-f/pictures/</files>
  <action>
In `e2e/three-d-export.spec.ts` (brief, Rules; every word from `THREE_D_COPY`, every expected value from the app's own
readers — `readBrdText`, `unscrambleBrd`, `brdPreview`, `brdPreviewWords` — never typed):
- Case 1 (Fish): inside the dialog, before saving, the swallow note `[data-brd-preview-swallow]` shows and the channels
  note does not; after saving, the dialog's facts line (kept before Save) equals `THREE_D_COPY.previewFacts(...)` built
  from `brdPreviewWords(brdPreview(read), "imperial")` of the downloaded file — proof the dialog was drawn from the very
  bytes saved; the side view's slice lines count equals the top view's and the file's fitted sections.
- Case 6 (failure, desktop): the forced `createObjectURL` throw now fires at Save — expect the dialog closed, the failed
  line in warning ink and the "could not be made" console error, then Export again opens the dialog and Save downloads
  the whole file (P-10).
- Cases 7 and 8: the channels note (and in 8 the swallow note too) also shows inside the dialog.
- New case 9, "the preview steps through the slices and Cancel saves nothing" (all three projects): open the dialog on
  the Deep Single Shortboard with 4 channels (`presetBottom`) and keep the slice line it opens on; press › and ‹ and expect the slice line to
  change to the neighbour and back; on desktop press ArrowLeft / ArrowRight with focus in the dialog and expect the same;
  tap (`page.touchscreen.tap` on the phones, `page.mouse.click` on desktop) the centre of `[data-brd-preview-top]
  [data-brd-slice="3"]`'s box and expect `Slice 3 of N`, then the same in the side view with another slice; expect the
  slice drawing's `data-brd-preview-slice-at` to follow. Count downloads with `page.on("download")`; press Cancel, wait
  one second, expect zero downloads, the dialog gone and the status line unchanged; open again, press Escape, same; on
  desktop open again and click outside the dialog (the backdrop's top-left corner), same. Finally open, Save, and expect
  the kept opening line to equal `THREE_D_COPY.previewSliceLine(openingSlice + 1, count, stations[openingSlice])` built
  from `brdPreview` and `brdPreviewWords(..., "imperial")` of the downloaded file.
- New case 10, Metric (desktop): `setMetricUnits(page)`, open the dialog, expect the slice line's distance and the facts
  line to equal `brdPreviewWords(..., "metric")` of the saved file (dims end ` cm` once).
- New phone cases (brief item 5), following `e2e/rocker-custom.spec.ts`'s sideways describes: on the `iphone` and
  `android` projects upright, open the dialog and expect Cancel, Save .brd File, ‹ and › each at least 44 dots tall
  (‹ › 44 wide too) and Cancel and Save inside the viewport; scroll each of the three drawings into view and expect it
  visible. Then the same on a real sideways iPhone (844 × 390) and a Pixel 7 held sideways (each its own describe with
  `test.use` and a project skip), plus a Save that downloads the file.

In `e2e/board-lock-screens.spec.ts` "x-3d": click Export, expect `[data-brd-preview]`, then `Promise.all` the download
with the dialog's Save; the rest of the case (the done line, panel text, no save, still locked) stays as it is.

Update CLAUDE.md's Layout sentence about Export .brd File (around line 168) with one plain clause: pressing it opens a
preview drawn from the file's own bytes (`lib/export/brd-preview.ts`, quick 261112-dbi) and the file is saved from the
preview's Save .brd File.

Run, in this order, each in its own call (long runs in the background): `lsof -nP -iTCP:3117 -sTCP:LISTEN` must print
nothing first (if a dev server already holds this worktree's lock, stop and report rather than stopping someone
else's); the whole export spec on all three projects; `e2e/board-lock-screens.spec.ts -g "3d"` and
`e2e/desktop-baseline.spec.ts -g "3D"` on desktop (the page with the dialog closed must not change: if the baseline
fails, stop, report the diff picture's path, never re-record). A lone failure on a cold server is re-run alone before it
is believed, and named in the SUMMARY if it was a load flake.

Pictures (brief, Rules): with a scratch Playwright config outside the repo (the 261103-gcm recipe; absolute imports
into the worktree) against the dev server on 3117, save PNGs under this task's `pictures/`:
`preview-desktop-light-deep-single.png` and `preview-desktop-dark-deep-single.png` (desktop 1280 × 800, Daylight and
Slate, the Shortboard with a Deep Single and 4 channels, the dialog open on its opening slice),
`preview-desktop-fish.png` (the Fish, swallow note showing), `preview-phone-upright.png` (iPhone) and
`preview-phone-sideways.png` (the 844 × 390 iPhone). Archive the shoot source as `pictures/shoot-source.tar.gz`; leave no
`.ts` file loose under `.planning/`. Read every picture yourself and check: nose left; the slice lines aligned between the
two views; the selected slice marked in both and drawn in SLICE with the concave visible on the Deep Single; nothing
clipped; both buttons in view; the dark picture readable. Fix and re-shoot anything that is wrong before writing the
SUMMARY, and say in the SUMMARY what each picture shows.

Commit the specs, CLAUDE.md and the pictures (stage files by name; plain English, ending with
`Co-Authored-By: Claude <noreply@anthropic.com>`), e.g. "Browser tests save the board file through its preview on a
computer and both phones, and pictures of the preview for a look".
  </action>
  <verify>
    <automated>PW_PORT=3117 npx playwright test e2e/three-d-export.spec.ts && PW_PORT=3117 npx playwright test e2e/board-lock-screens.spec.ts -g "3d" --project=desktop && PW_PORT=3117 npx playwright test e2e/desktop-baseline.spec.ts -g "3D" --project=desktop && ls .planning/quick/261112-dbi-export-brd-file-opens-a-preview-of-the-f/pictures/preview-desktop-light-deep-single.png .planning/quick/261112-dbi-export-brd-file-opens-a-preview-of-the-f/pictures/preview-desktop-dark-deep-single.png .planning/quick/261112-dbi-export-brd-file-opens-a-preview-of-the-f/pictures/preview-desktop-fish.png .planning/quick/261112-dbi-export-brd-file-opens-a-preview-of-the-f/pictures/preview-phone-upright.png .planning/quick/261112-dbi-export-brd-file-opens-a-preview-of-the-f/pictures/preview-phone-sideways.png</automated>
  </verify>
  <done>
- The export spec passes on desktop, iphone and android: every download goes through the dialog; slice lines match the file; ‹ ›, keys and taps pick slices; Cancel, Escape and a click outside save nothing; the notes show inside the dialog; the failure case shows the failed line; the phone buttons are 44 dots and in view upright and sideways.
- The locked-board 3D case passes through the dialog; the 3D desktop baseline passes unchanged.
- Five pictures are saved, each looked at, and described in the SUMMARY; the shoot source is archived.
- Committed with a plain-English message.
  </done>
</task>

</tasks>

<threat_model>
## Trust Boundaries

| Boundary | Description |
|----------|-------------|
| board in the browser → .brd bytes → preview | the preview reads back bytes the same tap just wrote; no outside input crosses in |
| preview dialog → download | the Save tap hands the browser the bytes already shown |

## STRIDE Threat Register

| Threat ID | Category | Component | Severity | Disposition | Mitigation Plan |
|-----------|----------|-----------|----------|-------------|-----------------|
| T-dbi-01 | Tampering | `brdFileWithPreview` / `onSaveBrd` | medium | mitigate | The preview is `readBrdText(unscrambleBrd(data))` of the very `data` array that Save downloads, and the browser case compares the dialog's facts line with the downloaded file's own reading, so the picture and the file cannot drift apart |
| T-dbi-02 | Denial of service | the read-back in the Export tap | low | accept | Synchronous and only on Export; the strict reader throws on anything unexpected, which shows the failed line instead of a dialog |
| T-dbi-03 | Spoofing | the Save download in Safari | low | mitigate | The download starts synchronously inside the Save tap with nothing awaited, the same hidden-link idiom as before; the iPhone (WebKit) project proves it |
</threat_model>

<source_audit>
| Source item | Covered by |
|-------------|-----------|
| Brief 1 — drawn from the file's bytes, one line saying so | Task 1 (brdFileWithPreview, previewFromFile), Task 3 (facts equal the saved file's) |
| Brief 2 — top view, slice, side view, slice line text, no-stretch rule, pick by tap/‹ ›/keys, opens near wide point | Tasks 1-2 (P-1, P-2, P-6, P-7), Task 3 case 9 |
| Brief 3 — facts line, notes, Save and Cancel | Task 2, Task 3 cases 1, 7, 8, 10 |
| Brief 4 — Save inside the tap, done line; Cancel/Escape/outside save nothing | Task 1, Task 3 case 9 and case 6 |
| Brief 5 — app dialog, wide on a computer, phone and short screen, 44 dots, no phone variant | Task 2 layout, Task 3 phone cases |
| Brief 6 — drafting grammar, palette tokens, nose direction | Task 2 (P-3, P-4), Task 3 pictures light and dark |
| Brief 7 — the words | Tasks 1-2 in three-d-copy.ts |
| Rules — lib module and tests, units.ts, bytes untouched, e2e updates, pictures, worktree only | Tasks 1-3 |
</source_audit>

<verification>
- `npx vitest run lib/export/brd-preview.test.ts components/design/board-lock-scope.test.ts` green (never the whole suite).
- `npx next typegen && npx tsc --noEmit` clean; `npm run lint` no new problems.
- `PW_PORT=3117 npx playwright test e2e/three-d-export.spec.ts` on all three projects.
- `PW_PORT=3117 npx playwright test e2e/board-lock-screens.spec.ts -g "3d" --project=desktop` and `e2e/desktop-baseline.spec.ts -g "3D" --project=desktop` pass, the baseline not re-recorded.
- Five pictures saved and looked at.
- Work stays in /Users/kontoes/Code/shaper/.claude/worktrees/close-bottom-17 (absolute paths, `git -C`, never `cd`); no push, no merge; AkuShaper, Shape3D and ~/Downloads untouched.
</verification>

<success_criteria>
- Export .brd File opens the Board file preview; the file is saved only from Save .brd File, byte for byte the file it was before this change.
- The three drawings, the slice line and the facts line are all read from the file, and a shaper can step through every slice.
- It works and fits on a computer, an upright phone and a phone held sideways, in light and dark.
</success_criteria>

<output>
Create `.planning/quick/261112-dbi-export-brd-file-opens-a-preview-of-the-f/261112-dbi-SUMMARY.md` when done, in plain
English for a shaper: what pressing Export .brd File now does, what each of the five pictures shows, the slice counts
of the three test boards, the choices P-1 to P-10 for the founder's pen, and whether the 3D baseline held.
</output>
