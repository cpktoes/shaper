---
phase: quick-261112-lmr
plan: 01
type: execute
wave: 1
depends_on: []
files_modified:
  - lib/geometry/side-profile.ts
  - lib/geometry/side-profile.test.ts
  - lib/export/brd-preview.ts
  - lib/export/brd-preview.test.ts
  - components/3d/export-cnc.ts
  - components/3d/three-d-screen.tsx
  - components/3d/brd-preview-dialog.tsx
  - components/3d/three-d-copy.ts
  - components/bottom/bottom-section.tsx
  - e2e/three-d-export.spec.ts
  - CLAUDE.md
  - .planning/quick/261112-lmr-side-profile-at-the-stringer-and-at-the-/pictures/
autonomous: true
requirements: [QT-261112-lmr]
estimate:
  # One executor, this worktree, three tasks: the shared maths with its tests wired through the preview to one dashed
  # line in the dialog and one browser case (tracer); the Height buttons, the key and the facts line; then the browser
  # specs on three projects (WebKit is slow on the dev server), the 3D baseline, the lock case and eight pictures looked at.
  # Calibration: factor 1, 0 samples, so confidence is low.
  tokens: 180000
  raw_tokens: 180000
  tasks: 3
  confidence: low
must_haves:
  truths:
    - "On a Shortboard with a Deep Single Concave the Board file preview's SIDE VIEW draws two bottom lines: the file's own bottom at the stringer (the board's ink edge, as now) and a dashed line at the rail, before the rails are shaped, lying below the stringer's through the concave (brief item 2)."
    - "On a Rolled Vee board the dashed rail line sits above the stringer's line at the tail; on a flat board (and any bottom whose stringer and rail never part by more than DATA's 0.25 mm) only one line is drawn (brief items 1, 2)."
    - "The rail line is the file's own stringer bottom moved, at each of its points, by the foam off at the rail less the foam off at the stringer from the shared maths, read on the channel-less bottom the file was written from, so both lines sit on the file's rocker (brief item 2)."
    - "A key under the side view says what each line is: an ink swatch 'at the stringer' and a dashed swatch 'at the rail, before the rails are shaped' (one swatch 'at the stringer and at the rail — the same line on this bottom' when one line is drawn) (brief item 2)."
    - "BOTTOM's own Height ×1 ×2 ×4 ×8 buttons stand beside the SIDE VIEW caption, open at ×4 every time the preview opens, stretch the side view's height only, and the caption says which is on (SIDE VIEW · HEIGHT ×4, SIDE VIEW · TRUE HEIGHT); the top and side views keep one length scale, so each slice's line in the top view stays above its line in the side view (brief item 2)."
    - "The facts line reads, on the Deep Single 6'2\" Shortboard, `22 slices · none more than 4\" apart · 6'2\" × 18 3/4\" · 2 1/8\" at the stringer · 2 1/4\" side profile max` — the stringer figure the file's own p03, the maximum from the shared maths, both shown on a flat board where they are equal, Metric in centimetres to one decimal (brief item 3)."
    - "The shared maths lives pure and tested in lib/geometry/side-profile.ts and takes exactly what BOTTOM already has (the resolved bottom, the BottomBoard, the planed side profile's rocker and thickness), so the BOTTOM page can call it unchanged next (brief item 1, Rule 1)."
    - "The file's bytes do not change: brdFileWithPreview still hands back brdFile's own array, byte for byte (Rules)."
  artifacts:
    - path: lib/geometry/side-profile.ts
      provides: "SIDE_PROFILE_STEP, SideProfilePoint, SideProfileLines, sideProfileAt, sideProfileStations, sideProfileLines — the bottom at the stringer and at the rail on the planed blank, the deck, the stringer thickness and the side profile's maximum"
    - path: lib/geometry/side-profile.test.ts
      provides: "flat, Deep Single, Rolled Vee, channels, swallow and diamond cases; DATA's own rows agree"
    - path: lib/export/brd-preview.ts
      provides: "BrdSideProfileInput, BrdPreviewProfile, brdPreviewProfile, BRD_PREVIEW_SIDE_HEIGHT; brdFileWithPreview's fourth argument; brdPreviewFrames' rail line and height; brdPreviewWords' two thicknesses"
    - path: components/3d/brd-preview-dialog.tsx
      provides: "the dashed rail line, the key, the Height buttons and the two-thickness facts line"
    - path: components/bottom/bottom-section.tsx
      provides: "HeightPicker exported, unchanged"
    - path: .planning/quick/261112-lmr-side-profile-at-the-stringer-and-at-the-/pictures/
      provides: "eight pictures, each looked at, and shoot-source.tar.gz"
  key_links:
    - from: components/3d/three-d-screen.tsx onExport
      to: components/3d/export-cnc.ts makeBrdExport
      via: "the file's resolved bottom (resolvedBottom, or resolveBottom(fileBottom, bottomBoard) when channels were left out), bottomBoard and sideProfile"
    - from: lib/export/brd-preview.ts brdFileWithPreview
      to: lib/geometry/side-profile.ts
      via: "brdPreviewProfile calls sideProfileAt at every point of the file's bottom line and sideProfileLines for the maximum"
    - from: components/3d/brd-preview-dialog.tsx
      to: components/bottom/bottom-section.tsx HeightPicker
      via: "import of the exported HeightPicker; state opens at BRD_PREVIEW_SIDE_HEIGHT (4)"
    - from: components/3d/brd-preview-dialog.tsx facts line
      to: lib/export/brd-preview.ts brdPreviewWords
      via: "brdPreviewWords(preview, system, file.profile.maxThickness) into THREE_D_COPY.previewFacts"
---

<objective>
The Board file preview's SIDE VIEW draws two side profiles overlaid — the bottom along the stringer (the file's own, as
now) and the bottom at the rail on the planed, rectangular blank before the rails are shaped — with BOTTOM's Height ×1 ×2
×4 ×8 stretch opening at ×4 and a small key; the facts line quotes both thicknesses: the file's at the stringer and the
side profile's maximum. The maths behind both is new, pure and tested in `lib/geometry/side-profile.ts`, shaped so the
BOTTOM page can call it unchanged next (that page's placement is sketched first and is NOT part of this task).

Purpose: the founder, 2026-11-12 — a concave bottom's stringer line looks "a little wonky" on its own; seeing the line
at the rail beside it shows how the contours change the flow of the rocker. A shaper can then trust the side view and
see both thicknesses before saving the file.

Output: the shared module and its tests, the preview's rail line, Height buttons, key and two-thickness facts line, the
browser spec updated and run on three projects, and eight pictures in this task's `pictures/`.
</objective>

<execution_context>
@$HOME/.claude/gsd-core/workflows/execute-plan.md
@$HOME/.claude/gsd-core/templates/summary.md
</execution_context>

<context>
@.planning/quick/261112-lmr-side-profile-at-the-stringer-and-at-the-/BRIEF.md
@.planning/quick/261112-dbi-export-brd-file-opens-a-preview-of-the-f/261112-dbi-SUMMARY.md
@CLAUDE.md
@lib/export/brd-preview.ts
@lib/export/brd-preview.test.ts
@components/3d/brd-preview-dialog.tsx
@components/3d/export-cnc.ts
@components/3d/three-d-copy.ts
@components/bottom/bottom-section.tsx
@e2e/three-d-export.spec.ts

<interfaces>
Already in the code (do not change their behaviour):

- `lib/geometry/bottom.ts`: `foamOff(resolved, board, s, y)` (the one number, channels included — they take exactly 0 at
  the stringer), `sectionsFoamOff(resolved, board, s, y)` (vees, bellies, concaves only, never channels), `resolveBottom`,
  `pickCut(bottom, section, name, board)`, `startingChannels(4, board, current)`, `DEFAULT_BOTTOM`,
  `BOTTOM_DATA_DEPTH_SHOWN` (0.25 mm, DATA's "—" rule), `bottomDataRows(resolved, board)` (rows with `station`,
  `stringerLeft` = thicknessAt less foamOff at 0 or null in a swallow's notch, `railLift` = sectionsFoamOff at railAt),
  types `ResolvedBottom`, `BottomBoard` (has `length`, `railAt(s)`, `thicknessAt(s)`, `notchInner(s)`).
- `lib/geometry/board-profile.ts`: `BoardSideProfile` with `rockerAt(s)` (planed bottom, lowest point 0) and
  `thicknessAt(s)` (planed thickness). `designBottomBoard`'s `thicknessAt` is this same function.
- `lib/geometry/bottom-draw.ts`: `type SectionHeight = 1 | 2 | 4 | 8`; `sectionHeightLabel({ heightAsked, heightDrawn })`
  answers `TRUE HEIGHT` at 1 and `HEIGHT ×4` etc.
- `lib/export/brd.ts`: `brdFileBottom(bottom, board)` (the bottom with channels switched off, or the very same object when
  there are none), `brdBottomStations(resolved)`.
- `lib/export/brd-preview.ts`: `brdPreview(read)` (file-only — keep it so), `brdFileWithPreview(surface, boardName,
  options)`, `brdPreviewFrames(preview, width)`, `brdPreviewWords(preview, system)`, `BRD_PREVIEW_PAD_X` 10,
  `BRD_PREVIEW_PAD_Y` 8; `preview.bottom` / `preview.deck` are `(distance from the tail, height)` lines in mm;
  `preview.thickness` is the file's p03 (the most, along the stringer, of the finished deck less bottom).
- `components/bottom/bottom-section.tsx`: local `function HeightPicker({ height, onHeight })` — group `data-bottom-height`,
  `data-lock-exempt`, the word Height (hidden under `max-shell` and on a short screen), four buttons `×1 ×2 ×4 ×8` with
  `aria-pressed` and spoken names `BOTTOM_COPY.heightButtonName(factor)` ("Height ×4"), coarse touch boxes.
- `components/design/board-lock-scope.test.ts` expects bottom-section.tsx's interactive tags to be exactly one mapped
  `button` — so HeightPicker must stay in that file (export it; never move it).

Measured at plan time (scratch scripts, `npx tsx`):

| Board (live preset, as the e2e builds it) | file p03 | shared stringer max | side profile max | rail − stringer |
|---|---|---|---|---|
| 6'2" Shortboard, Deep Single + 4 channels | 2.1499" (2 1/8") | 2.1499" (2 1/8") | 2.2500" (2 1/4") | down to −6.35 mm |
| 6'2" Shortboard, Rolled Vee | 2.2500" (2 1/4") | 2.2500" | 2.2500" (2 1/4") | up to +6.35 mm |
| 6'2" Shortboard, flat | 2.2500" | 2.2500" | 2.2500" | 0 |
| 5'8" Fish, flat | 2.5000" (2 1/2") | 2.5000" | 2.5000" | 0 |

The fixture boards (`phase16Boards()`, `shortboard|asis|hard`) read the same four figures. Every slice's own thickness in
the file equals the shared maths' deck less stringer bottom to 0.000 mm; the file's stringer bottom is within 0.45 mm of
rocker + foam off. Channels change neither line by exactly 0. No rail line ever rises past the deck on these boards.
Sampling every 1/4" agrees with a 0.5 mm scan to under 0.001 mm on all 40 fixture boards × flat/Deep Single/Rolled
Vee/Spiral Vee/Teardrop with 4 channels, every number finite (swallow and diamond included), about 5–7 ms per board.
Side view height at 760 dots wide: ×1 61, ×4 197, ×8 378 dots (Shortboard); 345 dots wide: ×4 95, ×8 175.
</interfaces>
</context>

<tasks>

<task type="tracer" tdd="true">
  <name>Task 1 (tracer): the shared side-profile maths, wired through the preview to one dashed rail line in the SIDE VIEW</name>
  <files>lib/geometry/side-profile.ts, lib/geometry/side-profile.test.ts, lib/export/brd-preview.ts, lib/export/brd-preview.test.ts, components/3d/export-cnc.ts, components/3d/three-d-screen.tsx, components/3d/brd-preview-dialog.tsx, e2e/three-d-export.spec.ts</files>
  <behavior>
    side-profile.test.ts (fixture boards from `phase16Boards()`, built once at module scope; board facts through
    `designSideProfile(fields, LIVE_DESIGN_RULES)`, `buildOutline`, `designBottomBoard(..., designFinPlacement(fields))`):
    - Flat `shortboard|asis|hard` (DEFAULT_BOTTOM): every point's stringerBottom, railBottom and planedBottom are equal;
      stringerThickness and maxThickness both equal the largest `thicknessAt` over the stations and both format as `2 1/4"`
      through `formatInchesFraction`.
    - Deep Single (`pickCut(DEFAULT_BOTTOM, "center", "Deep Single Concave", board)`): at every station strictly inside the
      resolved center cut's start..end, stringerBottom ≥ railBottom; at its deepest station stringerBottom − railBottom >
      1 mm; stringerThickness < maxThickness; they format `2 1/8"` and `2 1/4"`.
    - Rolled Vee (`pickCut(..., "tail", "Rolled Vee", ...)`): stringerFoamOff is 0 at every station; railBottom ≥
      stringerBottom everywhere; at the tail cut's deepest station railBottom − stringerBottom > 1 mm; stringerThickness
      equals maxThickness.
    - Channels change neither line: the Deep Single with `startingChannels(4, ...)` added gives points `toEqual` the
      Deep Single without.
    - DATA agrees: for every `bottomDataRows` row with a non-null stringerLeft, `thicknessAt(s) − stringerFoamOff` from
      `sideProfileAt` equals it exactly, and railFoamOff equals the row's railLift exactly (Deep Single and Rolled Vee).
    - Every number finite and stations rising from 0 to the length in steps no wider than 1/4", on
      `shortboard|swallow|hard`, `shortboard|diamond|hard` and `fish|asis|hard`, each flat, Deep Single and Rolled Vee.
    - `deck` is exactly planedBottom + thicknessAt; `sideProfileAt` at −10 mm reads as at 0 and at length + 10 mm as at
      the length (clamped).
    brd-preview.test.ts additions:
    - Every CASE passes its side-profile input (fourth argument); the byte-for-byte case still holds.
    - Flat Shortboard and Fish: `profile.railBottom` is null and `profile.maxThickness` is within 0.1 mm of
      `preview.thickness`.
    - Deep Single: railBottom has the same x's as `preview.bottom`, and each height is that point's bottom height plus
      (railFoamOff − stringerFoamOff) of `sideProfileAt` there, within 1e-9; at the middle slice's station the rail
      line lies more than 1 mm below the stringer bottom; maxThickness equals `sideProfileLines(...).maxThickness`
      exactly and exceeds `preview.thickness` by more than 1 mm; every slice's `thickness` agrees with that station's
      deck − stringerBottom from `sideProfileAt` within 0.05 mm.
    - A Rolled Vee Shortboard (built like the Deep Single, rail describe only): railBottom non-null and above the
      stringer bottom at the tail cut's deepest station.
    - Frames with the rail line: every rail point inside the side box at 330, 760 and 1000 dots; with no rail line the
      frames are exactly what they were (the existing true-height and alignment cases stay green unchanged).
  </behavior>
  <action>
    Write the tests first (RED), then the code (GREEN).

    1. Create `lib/geometry/side-profile.ts` (brief item 1; Rule 1 — pure: imports only from `./bottom`, `./board-profile`
    (type), `./units`). Header comment in the house style: the founder's ask of 2026-11-12, what it reads, that channels
    never count at the rail (the "Match RAILS" ruling, 2026-11-11) and take nothing at the stringer, and that the BOTTOM page
    will call it next. Exports:
    - `SIDE_PROFILE_STEP: Mm` = `inchesToMm(1 / 4)` (measured: agrees with a 0.5 mm scan under 0.001 mm).
    - `interface SideProfilePoint { station; stringerFoamOff; railFoamOff; planedBottom; stringerBottom; railBottom; deck }`,
      all `Mm`, each with a one-line doc comment.
    - `sideProfileAt(resolved: ResolvedBottom, board: BottomBoard, profile: Pick<BoardSideProfile, "rockerAt" | "thicknessAt">, s: Mm): SideProfilePoint`
      — the station clamped to 0..board.length; stringerFoamOff = `foamOff(resolved, board, s, mm(0))` (DATA's stringer
      left basis); railFoamOff = `sectionsFoamOff(resolved, board, s, board.railAt(s))` (DATA's rail lift);
      planedBottom = `profile.rockerAt(s)`; stringerBottom and railBottom = planedBottom raised by each foam off; deck =
      planedBottom + `profile.thicknessAt(s)` (one deck: the blank is rectangular across before the rails are shaped).
      Inside a swallow's notch the stringer is air; read it as the file does, the tail written square — say so in the
      doc comment.
    - `sideProfileStations(board: Pick<BottomBoard, "length">): Mm[]` — 0, every SIDE_PROFILE_STEP, and the length itself
      (no repeat when the length lands on a step), the shape of `bottomDataStations`.
    - `interface SideProfileLines { points: SideProfilePoint[]; stringerThickness: Mm; maxThickness: Mm }` and
      `sideProfileLines(resolved, board, profile): SideProfileLines` — points at `sideProfileStations`; stringerThickness =
      the most of deck − stringerBottom; maxThickness = the most of deck less the lower of the two bottom lines.
    Positional arguments in bottom.ts's order (resolved, board, ...), so BOTTOM can call it with `useDesign()`'s
    `resolvedBottom`, `bottomBoard` and `sideProfile` unchanged. No inch factor written by hand anywhere: `inchesToMm`.

    2. `lib/export/brd-preview.ts` (brief item 2): add
    - `interface BrdSideProfileInput { resolved: ResolvedBottom; board: BottomBoard; profile: Pick<BoardSideProfile, "rockerAt" | "thicknessAt"> }`
      — doc: the bottom the file was written from (the channel-less one, `brdFileBottom`), the board, the planed profile.
    - `interface BrdPreviewProfile { railBottom: P2[] | null; maxThickness: Mm }` — railBottom: the bottom at the rail
      before the rails are shaped, along the file's own stringer bottom, null where it never parts from it by more than
      `BOTTOM_DATA_DEPTH_SHOWN` (one line is drawn); maxThickness: `sideProfileLines(...).maxThickness`.
    - `brdPreviewProfile(preview: BrdPreview, sides: BrdSideProfileInput): BrdPreviewProfile` — for each `[x, h]` of
      `preview.bottom`, the point `[x, h + railFoamOff − stringerFoamOff]` from `sideProfileAt(..., mm(x))`; null when no
      point's difference exceeds BOTTOM_DATA_DEPTH_SHOWN in size.
    - `BrdFileWithPreview` gains `profile: BrdPreviewProfile`; `brdFileWithPreview(surface, boardName, options: BrdOptions, sides: BrdSideProfileInput)`
      — both now required (no default for options), `data` still brdFile's own array untouched, `preview` still
      `brdPreview(readBrdText(unscrambleBrd(file.data)))` (file-only), `profile` = `brdPreviewProfile(preview, sides)`.
      Update its doc comment: the rail line and the maximum come from the board maths, everything else from the bytes.
    - `brdPreviewFrames(preview, width, side: { railBottom?: readonly P2[] | null } = {})` — `BrdSideFrame` gains
      `rail: P2[] | null` (the rail line through the same `sx`/`sy`); the side box's high and low take the rail line into
      account too (max over deck and rail, min over bottom and rail). With no rail line the numbers are exactly as now.
      (Task 2 adds the height to this same options object.)

    3. `components/3d/export-cnc.ts`: `makeBrdExport(surface, boardName, bottomStations, sides: BrdSideProfileInput)`
    passes `{ bottomStations }` and `sides` through; doc comment says what sides is. `components/3d/three-d-screen.tsx`
    onExport: work out the file's resolved bottom once — `resolvedBottom` when `fileBottom === bottom`, otherwise
    `resolveBottom(fileBottom, bottomBoard)` — use it for `brdBottomStations` and hand `{ resolved: that, board:
    bottomBoard, profile: sideProfile }` to makeBrdExport (sideProfile is already destructured from useDesign). Keep the
    surface logic and comments as they are.

    4. `components/3d/brd-preview-dialog.tsx`: pass `{ railBottom: file.profile.railBottom }` to brdPreviewFrames (and
    `file.profile` into its memo deps). In the side view: give the board polygon `data-brd-side-line="stringer"`; after it,
    when `frames.side.rail` is non-null, a `polyline` with `data-brd-side-line="rail"`, `fill="none"`, the GUIDE's
    pushed-setting stroke (`stroke="var(--outline-push-line)"`, `strokeDasharray="3 2"`, `strokeWidth={1.2}`, the same
    three values `components/guide/guide-cartoon.tsx` gives its push line — a token already contrast-checked at 3:1 on the
    panel and on the board fill in all four themes, distinct from the faint 5 4 slice lines and the marked slice's ink
    dash-dot); then the slice lines as now (the marked one still last, on top). Comment why the rail line is dashed.

    5. Tests per the behavior block: create `lib/geometry/side-profile.test.ts`; in `brd-preview.test.ts` make each CASE
    carry its `BrdSideProfileInput` (flat boards: `resolveBottom(DEFAULT_BOTTOM, board)`; the Deep Single: the resolved
    `fileBottom` it already builds), pass `{}` and the input where calls had defaults, and add a describe for the rail
    line. In `e2e/three-d-export.spec.ts` add case `11. the side view draws the bottom at the stringer and at the rail on a
    Deep Single, and one line on a flat board`: keepBoard Shortboard with `presetBottom("Shortboard", { deepSingle: true,
    channels: true })`, open the preview, expect `[data-brd-preview-side] [data-brd-side-line]` to count 2 with the values
    `stringer` and `rail`; then in a fresh page (or a second test step with its own keepBoard and reload — follow how
    case 7 uses a second page) the plain Shortboard counts 1, `stringer` only. Runs on every project.

    Commit (git -C the worktree, message via `commit -F -`): "The board file preview's side view draws the bottom at the
    rail beside the bottom at the stringer" with a plain-English body (a concave's rail line sits under the stringer's,
    a vee's over it; the file itself is unchanged) and the Co-Authored-By line.
  </action>
  <verify>
    <automated>npx vitest run lib/geometry/side-profile.test.ts lib/export/brd-preview.test.ts && npx next typegen && npx tsc --noEmit && test -z "$(grep -nE '^import .*(react|next|drizzle)' lib/geometry/side-profile.ts)" && test "$(grep -vE '^[[:space:]]*(\*|//)' lib/geometry/side-profile.ts | grep -c '25\.4')" = 0 && PW_PORT=3117 npx playwright test e2e/three-d-export.spec.ts --project=desktop -g "the side view draws the bottom"</automated>
  </verify>
  <done>Both Vitest files pass (the byte-for-byte case included); tsc is clean; on a computer the Deep Single's preview draws two `data-brd-side-line` elements and the flat Shortboard's one; the commit is on close-bottom-17.</done>
</task>

<task type="auto" tdd="true">
  <name>Task 2: Height ×1 ×2 ×4 ×8 on the SIDE VIEW (opening at ×4), the key, and both thicknesses on the facts line</name>
  <files>lib/export/brd-preview.ts, lib/export/brd-preview.test.ts, components/bottom/bottom-section.tsx, components/3d/brd-preview-dialog.tsx, components/3d/three-d-copy.ts</files>
  <behavior>
    - `BRD_PREVIEW_SIDE_HEIGHT` is 4.
    - For each of the CASES at 760 dots, with heights 1, 2, 4 and 8: the side box's height less 2 × BRD_PREVIEW_PAD_Y is
      exactly k times its ×1 value (toBeCloseTo 9 places); the top frame is identical (`toEqual`) at every height; each
      slice line's x in the side view equals its top-view twin at every height; every side, slice-line and rail point
      stays inside the box at 330, 760 and 1000 dots at every height.
    - `brdPreviewWords(preview, "imperial", max)`: dims is `formatFeetInches(length) × formatInchesFraction(width)` (no
      thickness), stringer is `formatDim(preview.thickness, "imperial")`, profileMax is `formatDim(max, "imperial")`;
      Metric: dims `formatCentimetres(length) × formatCentimetres(width) cm` with cm once, the two thicknesses through
      `formatDim(..., "metric")`; gap and stations as now.
    - On the Deep Single the two thickness words differ (`2 1/8"` and `2 1/4"`); on the flat Shortboard they are equal.
  </behavior>
  <action>
    1. `lib/export/brd-preview.ts`: export `BRD_PREVIEW_SIDE_HEIGHT: SectionHeight = 4` (type from `../geometry/bottom-draw`)
    with a doc line (the founder, 2026-11-12: the same buttons as BOTTOM's cross-section, opening at ×4). Extend
    brdPreviewFrames' options to `{ railBottom?; height?: SectionHeight }`, height defaulting to 1: the side view's `sy`
    multiplies the height difference by `scale × height`, and its box height is `2 × BRD_PREVIEW_PAD_Y + (high − low) ×
    scale × height`; x stays `sx` so the top and side views keep one length scale (brief item 2). `BrdSideFrame` gains
    `heightFactor`. Rewrite BrdSideFrame's and BrdPreviewFrames' doc comments (no longer "at true height" — stretched by the
    Height pick). `brdPreviewWords(preview, system, maxThickness: Mm)`: `BrdPreviewWords` becomes `{ dims; stringer;
    profileMax; gap; stations }` — dims is length × width only (Imperial `6'2" × 18 3/4"`, Metric `188.0 × 47.6 cm`, cm once),
    stringer the file's p03 and profileMax the shared maximum, each through `formatDim` (brief item 3; every length through
    units.ts / measure-display.ts).

    2. `components/bottom/bottom-section.tsx`: add `export` to `function HeightPicker` and one doc sentence that the Board
    file preview's side view uses it too. Nothing else in the file changes (board-lock-scope.test.ts counts its tags).

    3. `components/3d/three-d-copy.ts`, words for the founder's pen:
    - `previewFacts: (count, gap, dims, stringer, max) => \`${count} slices · none more than ${gap} apart · ${dims} · ${stringer} at the stringer · ${max} side profile max\``
      — rewrite its doc comment: the stringer figure is the file's own (what AkuShaper and Shape3D read), the maximum is
      the side profile's from the board maths, the deck down to whichever bottom line is lower; equal on a flat board,
      both shown.
    - `previewSideViewAt: (height: string) => \`SIDE VIEW · ${height}\`` (height is `sectionHeightLabel`'s words).
    - `previewKeyStringer: "at the stringer"`, `previewKeyRail: "at the rail, before the rails are shaped"`,
      `previewKeyOneLine: "at the stringer and at the rail — the same line on this bottom"`.
    - `previewSideName: (count, height: number, twoLines: boolean)` — "The board file from the side, with its {count}
      slices", then ", the bottom at the stringer and at the rail" when twoLines, then ", true height" at 1 or ",
      height ×{height}".

    4. `components/3d/brd-preview-dialog.tsx`: in PreviewBody, `const [height, setHeight] = useState<SectionHeight>(BRD_PREVIEW_SIDE_HEIGHT)`
    (fresh at ×4 each time the preview opens — the body remounts; never saved, view-only so a locked board keeps it); pass
    `height` with railBottom to brdPreviewFrames; words from `brdPreviewWords(preview, system, file.profile.maxThickness)`.
    The SIDE VIEW caption row becomes BOTTOM's layout — `flex items-center justify-between gap-2` with `mb-1`: left the
    caption `THREE_D_COPY.previewSideViewAt(sectionHeightLabel({ heightAsked: height, heightDrawn: height }))` in
    CAPTION_CLASS, right `<div data-brd-preview-height>` wrapping the imported `HeightPicker` (height, onHeight=setHeight).
    The side svg gets `data-brd-preview-side-height={height}` and the new spoken name. Under the side svg, a key row
    `data-brd-preview-side-key` (`mt-1 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-surf-ink-muted`): when
    the rail line is drawn, two entries — `data-brd-side-key="stringer"` (a 24 × 6 aria-hidden svg with a solid
    `var(--outline-ink)` 1.1 line, then previewKeyStringer) and `data-brd-side-key="rail"` (the same swatch in the rail
    line's three stroke values, then previewKeyRail); otherwise one entry `data-brd-side-key="one"` with the ink swatch
    and previewKeyOneLine. The facts line calls `previewFacts(count, words.gap, words.dims, words.stringer, words.profileMax)`.
    Keep every existing data attribute and the focus/scroll behaviour. Do not touch `previewFromFile` (flagged to the
    founder in the summary: the rail line and the maximum are worked out from the board, beside the file's own lines).

    5. Tests per the behavior block in `brd-preview.test.ts` (update the two words cases to the new signature and fields).
    Then `npx eslint` on the five files.

    Commit: "The preview's side view stretches ×1 to ×8 like BOTTOM's cross-section, opening at ×4, with a key for its
    two lines, and its facts line quotes both thicknesses" (plain-English body, the Deep Single's 2 1/8" at the stringer
    and 2 1/4" side profile max as the example) and the Co-Authored-By line.
  </action>
  <verify>
    <automated>npx vitest run lib/export/brd-preview.test.ts lib/geometry/side-profile.test.ts components/design/board-lock-scope.test.ts && npx next typegen && npx tsc --noEmit && npx eslint lib/export/brd-preview.ts lib/export/brd-preview.test.ts components/bottom/bottom-section.tsx components/3d/brd-preview-dialog.tsx components/3d/three-d-copy.ts</automated>
  </verify>
  <done>The three Vitest files pass, tsc and eslint are clean; the dialog shows Height ×1 ×2 ×4 ×8 beside `SIDE VIEW · HEIGHT ×4`, the key under the side view and the two-thickness facts line; the commit is on close-bottom-17.</done>
</task>

<task type="auto">
  <name>Task 3: browser tests on three projects, the 3D baseline, and eight pictures looked at</name>
  <files>e2e/three-d-export.spec.ts, CLAUDE.md, .planning/quick/261112-lmr-side-profile-at-the-stringer-and-at-the-/pictures/</files>
  <action>
    1. `e2e/three-d-export.spec.ts` (Rules: every expected word from THREE_D_COPY / BOTTOM_COPY, every figure from the app's
    own readers, nothing typed twice):
    - A helper `sideProfileMaxOf(presetName, bottom?)`: presetFields → designBottomBoard (as presetBottom does) →
      `resolveBottom(brdFileBottom(bottom ?? DEFAULT_BOTTOM, board), board)` → `sideProfileLines(resolved, board,
      designSideProfile(fields, LIVE_DESIGN_RULES)).maxThickness`. Import `brdFileBottom` from `../lib/export/brd`,
      `resolveBottom` from bottom, `sideProfileLines` from `../lib/geometry/side-profile`.
    - Cases 1 and 10: words = `brdPreviewWords(saved, system, sideProfileMaxOf(...))` for the board each opens (the Fish
      with no bottom; the Shortboard with the Deep Single and channels), and the expected facts line is
      `previewFacts(count, words.gap, words.dims, words.stringer, words.profileMax)`. Case 10 keeps its "cm once" check on
      `words.dims` and adds that `words.stringer` and `words.profileMax` each end in ` cm`.
    - Case 11 (from Task 1): also expect the key's two entries to read previewKeyStringer and previewKeyRail on the Deep
      Single and the one entry previewKeyOneLine on the flat Shortboard; on the Deep Single the facts line's two
      thickness words differ, on the flat one they are equal.
    - New case `12. the Height buttons stretch the side view, opening at ×4, and keep the views lined up` (every project):
      Deep Single Shortboard; in the dialog's `[data-brd-preview-height]` the pressed button's name is
      `BOTTOM_COPY.heightButtonName(4)` and the svg's `data-brd-preview-side-height` is `4`; the caption reads
      `previewSideViewAt(sectionHeightLabel({ heightAsked: 4, heightDrawn: 4 }))` (import it from
      `../lib/geometry/bottom-draw`, never the words typed); read the side svg's viewBox height at ×4, press ×1 (by role
      and name), wait for the attribute `1` and the ×1 caption the same way, read it again, then ×8: (vb4 − 2·PAD_Y) / (vb1 −
      2·PAD_Y) is close to 4 and (vb8 − 2·PAD_Y) / (vb1 − 2·PAD_Y) close to 8 (import BRD_PREVIEW_PAD_Y); the top view's
      viewBox is the same at all three; one slice's `x1` in the top view equals its twin's in the side view after each press.
    Run, each in its own call (background if it may pass 10 minutes; read the final passed/failed line before going on):
    `PW_PORT=3117 npx playwright test e2e/three-d-export.spec.ts --project=desktop`, then `--project=iphone`, then
    `--project=android`; then `PW_PORT=3117 npx playwright test e2e/desktop-baseline.spec.ts --project=desktop -g 3D` (must
    pass unchanged — never update snapshots) and `PW_PORT=3117 npx playwright test e2e/board-lock-screens.spec.ts
    --project=desktop -g 3d`. A failure that passes when re-run alone is a load flake; say so in the summary.

    2. `CLAUDE.md`, the Layout paragraph's sentence about the Board file preview: add, inside its parenthetical, that its
    side view also draws the bottom at the rail before the rails are shaped, beside the file's own bottom at the
    stringer, from `lib/geometry/side-profile.ts`, stretched with BOTTOM's Height buttons (opening ×4), and that its facts
    line quotes the file's thickness at the stringer and the side profile's maximum. One sentence; nothing else changes.

    3. Pictures (Rules): extract the old script with `tar -xzf` of
    `.planning/quick/261112-dbi-export-brd-file-opens-a-preview-of-the-f/pictures/shoot-source.tar.gz` into
    `/private/tmp/claude-501/-Users-kontoes-Code-shaper/86389bad-1284-4de0-86f8-1a82686fc51e/scratchpad/lmr/shoot-new`
    (a copy already sits extracted at `.../scratchpad/lmr/shoot-old/shoot/`); point its config's testDir there and its
    PICTURES at this task's `pictures/`; add a Rolled Vee bottom (`pickCut(DEFAULT_BOTTOM, "tail", "Rolled Vee", board)`);
    before each shot scroll `[data-brd-preview-side]` into view so the side view, its key and the facts line show. Shoot
    at 1280 × 800: `preview-desktop-light-deep-single.png`, `preview-desktop-dark-deep-single.png` (slate),
    `preview-desktop-rolled-vee.png`, `preview-desktop-fish.png`; iPhone 14 upright `preview-phone-upright.png` and
    `preview-phone-upright-side.png` (scrolled to the side view); the real sideways iPhone 844 × 390
    `preview-phone-sideways.png` and `preview-phone-sideways-side.png`. Run with `PW_PORT=3117 npx playwright test -c
    <that config>`. Look at every picture with Read: the Deep Single's dashed line under the ink bottom through the
    middle, the Rolled Vee's above it at the tail, the Fish with one line and the one-line key, ×4 pressed, key and facts
    legible in Slate, nothing clipped, Cancel and Save in view. Fix and re-shoot anything wrong. Archive the script as
    `pictures/shoot-source.tar.gz` (never loose .ts files under .planning). No dev server left running on 3117.

    Commit: "Browser tests and pictures for the preview's two side profiles" (plain-English body: what the tests prove on a
    computer and both phones; the 3D page's own picture unchanged) with the Co-Authored-By line. No push, no merge.
  </action>
  <verify>
    <automated>PW_PORT=3117 npx playwright test e2e/three-d-export.spec.ts --project=desktop && PW_PORT=3117 npx playwright test e2e/three-d-export.spec.ts --project=iphone && PW_PORT=3117 npx playwright test e2e/three-d-export.spec.ts --project=android && PW_PORT=3117 npx playwright test e2e/desktop-baseline.spec.ts --project=desktop -g 3D && ls .planning/quick/261112-lmr-side-profile-at-the-stringer-and-at-the-/pictures/ | grep -c png</automated>
    <human-check>Eight pictures read one by one: two lines on the Deep Single and the Rolled Vee in the right order, one on the Fish, readable in light and dark, phones unclipped.</human-check>
  </verify>
  <done>three-d-export.spec.ts passes on desktop, iphone and android (cases 11 and 12 included); the 3D desktop baseline passes unchanged; the lock case passes; eight PNGs and shoot-source.tar.gz sit in this task's pictures/, each looked at; CLAUDE.md carries the one sentence; the commit is on close-bottom-17.</done>
</task>

</tasks>

<threat_model>
## Trust Boundaries

| Boundary | Description |
|----------|-------------|
| board maths → file | The preview's extra lines are worked out beside the file; they must never reach its bytes. |

## STRIDE Threat Register

| Threat ID | Category | Component | Severity | Disposition | Mitigation Plan |
|-----------|----------|-----------|----------|-------------|-----------------|
| T-lmr-01 | Tampering | lib/export/brd-preview.ts brdFileWithPreview | medium | mitigate | `data` stays brdFile's own array; the existing byte-for-byte case runs on every CASE with the new fourth argument, and cases 4 and 7 of the browser spec still compare saved bytes. |
| T-lmr-02 | Denial of service | the Export tap working out the side profile | low | accept | Measured 5–7 ms for a 6'2" (296 stations) inside a tap that already takes about 0.5–0.7 s; synchronous, as Safari's download rule needs. |
| T-lmr-03 | Information disclosure | the preview dialog | low | accept | Nothing leaves the browser: no request, no storage, no new dependency. |
</threat_model>

<verification>
- `npx vitest run lib/geometry/side-profile.test.ts lib/export/brd-preview.test.ts components/design/board-lock-scope.test.ts` — never the whole suite.
- `npx next typegen` then `npx tsc --noEmit`; `npx eslint` on the touched source and test files.
- `e2e/three-d-export.spec.ts` on desktop, iphone and android with `PW_PORT=3117`; `e2e/desktop-baseline.spec.ts -g 3D` and `e2e/board-lock-screens.spec.ts -g 3d` on desktop.
- Eight pictures re-taken into this task's `pictures/` and looked at.

Source audit (brief): item 1 shared maths, tests → Task 1; item 2 the rail line on the file's rocker from the channel-less bottom → Task 1; item 2 key, Height ×1–×8 opening ×4, one length scale → Task 2 (proved in Task 3); item 3 facts line, Metric → Task 2 (proved in Task 3); Rules: no formula in a component, units.ts, bytes unchanged, browser tests and pictures → Tasks 1–3. Out of scope by the brief: the side profile on the BOTTOM page (sketched first).
</verification>

<success_criteria>
- A shaper opening the preview on a Deep Single sees the dashed rail line under the stringer's through the concave, on a Rolled Vee over it at the tail, and one line on a flat board, with a key saying which is which.
- The side view opens at ×4 and BOTTOM's own Height buttons change it to ×1, ×2 or ×8; the caption says which.
- The facts line reads `… · 6'2" × 18 3/4" · 2 1/8" at the stringer · 2 1/4" side profile max` on the Deep Single 6'2" Shortboard, and centimetres in Metric.
- `lib/geometry/side-profile.ts` is pure, tested, and callable from BOTTOM unchanged; the file's bytes are unchanged.
</success_criteria>

<output>
Create `.planning/quick/261112-lmr-side-profile-at-the-stringer-and-at-the-/261112-lmr-SUMMARY.md` when done, in plain
English for a shaper: what the side view now shows, the measured thicknesses, the words for the founder's pen
(`previewFacts`, `previewSideViewAt`, the three key lines, `previewSideName`), the choices listed in this plan, and the
note that `previewFromFile` ("Drawn from the file itself …") was left as it was although the rail line and the maximum
are worked out from the board.
</output>
