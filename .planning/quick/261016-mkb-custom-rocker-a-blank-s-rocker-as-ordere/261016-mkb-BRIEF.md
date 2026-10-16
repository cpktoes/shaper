# Brief — quick 261016-mkb: custom rocker — a blank's rocker as ordered, saved as the shaper's own blank (sketch 016 D)

Written by the orchestrator for the planner, 2026-10-16. Everything under "Decided" is the founder's and is locked.
The founder's last word on the sketch: **"This now looks perfect. Let's build it."**

## Where this came from

- **The research:** `.planning/spikes/001-maker-rocker-conventions/README.md` (what each maker does; the US Blanks
  notation; `usb-public-rocker-listings.txt` — 282 verbatim lines of US Blanks' own stocked rockers, the reader's test
  set) and `.planning/spikes/002-custom-rocker-bend/README.md` (the even bend proven on 245 listed changes and all 219
  pickable blanks; `spike-source.tar.gz` → `custom-rocker-spike.mts` is the bend on the app's own curves).
- **The plan the design settled on:** `.planning/spikes/CUSTOM-ROCKER-PLAN.md` — §4 is the codebase touchpoint table,
  §5 the proposed pure-geometry shape, §6 every ruling with the founder's words, §6a saving a custom blank for later.
- **The sketch:** `.planning/sketches/016-custom-rocker/` — `README.md` (sixteen rounds of rulings, D the winner),
  `index.html` (open it; the "D ★" tab is the pick — its JS is the working geometry and drawing to port),
  `pictures/*.png`, `sketch-source.tar.gz` (`template.html` holds `noteOf`, `parseNote`, `delta` (the bend), `floorOf`
  and the drawing code at lines ~318–420; `data.json` is the two boards' real natural profiles dumped by the app's own
  `designSideProfile` / `prepareBlank`). MANIFEST decision 19 in `.planning/sketches/MANIFEST.md` is the whole design in
  one paragraph. Published copy for the founder's phone: https://claude.ai/artifact/VHmeU2C9rgSpaRpQ9inAmt
- The blank picker (quick 261015-ve9, sketch 015 B) is on `main` and in this branch; custom rocker builds on its BLANK
  button, its popup styling and its e2e helper.

## Decided (the founder, 2026-10-16 — all locked)

1. **One notation, app-wide: US Blanks'.** `-1/4"N18" +1/8"T36" +1/8"T18"` — nose changes first, then tail; `+` adds
   rocker at that tip, `-` takes it away; a figure after the N or T is where the bend starts, in whole inches in from
   that tip; no figure means the bend starts at the centre; changes stack. **The note is always in inches, in Metric
   too** — it is the maker's order code, like the blank's name. Every drawn, tabled or slid figure follows
   Imperial/Metric as marks (Rule 2).
2. **Every blank is named the same way: the name, then its rocker on its own line, `Natural` written out** — `9'4"B` /
   `Natural`, or `9'4"B` / `-1/4"N18" +1/8"T36"` — on the BLANK button, the picker's cards, the DATASHEET's group label
   and the order form (`US Blanks 9'4"B Natural — centered`). "NAT" is an accepted short form where room is tight.
3. **Tables: Natural Rocker over Custom Rocker.** A custom blank's station table (a picker card, the DATASHEET's BLANK
   block) has a **Natural Rocker** row (the catalogue's printed figures) and a **Custom Rocker** row (the figures as
   ordered, nose and tail tips exact). A natural blank's table is unchanged. The adjustment is written once, on the name
   line — never repeated in the table.
4. **One button right under the blank card — Customize Rocker › / Edit Custom Rocker ›** (no ADVANCED section) opens a
   popup **styled like PICK A BLANK** (the dialog's own surface; the drawing in a card like a picker card — page
   background, faint border — never a canvas-coloured panel) and **laid out like the ROCKER page**: the rows on the
   left, scrolling; the drawing beside them; on an upright phone the drawing pinned on top and the rows scrolling in the
   space beneath it, exactly as the page does.
5. **The rows:** NOSE and TAIL, each a change row of two sliders — **Rocker** (1/16" steps, 1 mm in Metric, −2" to +2",
   a value box) beside **Bend starts** (whole-inch steps from 3" in to the centre); "+ Add a second nose/tail change"
   for a maker's two-point adjustment. **A second change on an end must start nearer the tip than the first** (its
   slider is capped one inch nearer; moving the first pushes the second ahead of it). **Two changes stack:** the first
   is applied in full and the second on top of it, so `+1/2"N +1/2"N18"` lifts the nose tip exactly 1" above natural
   (proved on the sketch's build: 4 3/4" → 5 3/4"). ↺ Natural rocker clears everything.
6. **No rocker value goes negative.** "A negative rocker where the nose or tail would be below the centerpoint is not a
   realistic board." Each Rocker slider stops at the floor that keeps every part of the bent blank at or above the
   blank's low point (the centre on nearly every blank); its hint reads "Floor — the tip would drop below the centre"
   when it is there. +2" stays the top.
7. **The popup's drawing is a live aid, and the only place anything is coloured:** the bent blank on its bottom plane,
   the natural rocker dashed behind it, a short mark across the bottom where each bend starts, and **the deviation from
   natural drawn as US Blanks' catalogue page 11 draws it — the blank's outline (deck and bottom) red over the first
   change's span and blue over the second's, stacked on the first**; the note in the popup's header coloured the same
   way. **Show my board** switch, **off by default**: off, the blank alone with ALL its dimensions at its own five
   stations — its printed thickness as chips on one rail, its rocker as ordered on the other (tail tip, 12" in, the
   centre as the zero reference, 12" in, nose tip), the natural figure small beneath where it differs; on, the board in
   the blank with the surfboard's five stations as the page draws them. **The page's zoom works on the popup's drawing**
   (buttons, wheel, drag, pinch; strokes, dashes and type at screen size).
8. **On the ROCKER page itself a custom blank draws as any blank** — the bent foam alone: no dashed natural, no bend
   marks, nothing coloured. The sidebar shows only the result (the BLANK button's rocker line).
9. **Footer: Cancel · Use and save as a new blank · Use and edit current blank** — the third only when the board's blank
   already carries a custom rocker. A draft put back to natural offers "Use the natural rocker". **So every custom
   rocker in use is a saved blank of the shaper's own** — "it should not replace the natural rocker blank, but
   essentially add a new blank to our catalogue" — **starred the moment it is saved**, listed in PICK A BLANK beside the
   natural one and picked like any blank. Cancel, Esc, ✕ and a click outside change nothing.
10. **Switching to a different blank clears the custom rocker and starts from natural.** Remove This Blank keeps the
    board's figures (today's rule).
11. **The phone's screen tile** (`On a 9'4"B`): the rocker text joins it on every horizontal screen (a computer, a phone
    held sideways); on an upright phone only if it does not shrink the tile's board drawing — measure at build time,
    "off" is the fallback.
12. **Pictures before every merge, go-live on the founder's word.** Nothing migrates production or deploys without it.

## The geometry (Rule 1 — pure, tested, in `lib/geometry/`)

New `lib/geometry/custom-rocker.ts` + `custom-rocker.test.ts`. Positions along the blank are measured from the tail
tip, `0` to the blank's length `L`; the centre is `L/2`.

```ts
/** One change to the blank's natural rocker, in the makers' own terms. */
export interface RockerChange { end: "nose" | "tail"; amount: Mm; /** whole inches, absent = the centre */ fromTip?: Mm }
/** The blank's rocker as ordered. Empty = natural = every board today. */
export interface BlankRockerSpec { changes: RockerChange[] }
```

- **The even bend** (the sketch's `delta`, spike 002): a nose change with bend point `p` (`L − fromTip`, or the centre)
  adds `amount × ((x − p) / (L − p))²` for `x > p`; a tail change with bend point `p` (`fromTip`, or the centre) adds
  `amount × ((p − x) / p)²` for `x < p`; every change adds, so stacking is the plain sum. Zero slope at the bend point
  (no kink), the full amount exactly at the tip.
- **The floor** (the sketch's `floorOf`): for one change, the largest lowering such that `natural(x) + the other
  changes(x)` stays ≥ 0 wherever this change has a share (`u ≥ 0.02`): `−min over x of (have / u²)`, rounded down to the
  slider's step, never below −2". `bendAt`, `floorOf`, `normalizeSpec` (drop zero changes, nose before tail, each end's
  changes in bend order, the second nearer the tip, at most two per end, amounts within ±2", `fromTip` whole inches from
  3" to the centre).
- **`withCustomRocker(prepared: PreparedBlank, spec): PreparedBlank`** — the bent rocker as a real `PreparedPchip` /
  `LevelledCurve` through dense knots (fine enough that the crop re-level at `boardOnBlank` and the fine-tune low-point
  scan, which walk `curve.xs`, behave; the five printed stations and both tips ARE knots so the ordered figures read
  exactly `printed + bendAt`), **levelled on its true low point by `levelCurve`** as every blank is levelled (the
  floor keeps the tips above the low point, but a positive change from the centre on a blank whose low is off-centre —
  the Marko 10'2" M prints 0.21" at the centre — still moves the minimum a hair; level it, never clamp). Also carries the
  natural curve for the popup's dashed line. Thickness and width untouched — **the fit never changes**. Natural (empty
  spec) returns the prepared blank unchanged.
- **`customPrintedStations(copy, spec)`** — the five catalogue stations (N0, N12, C, T12, T0) as ordered: printed +
  `bendAt` at each, exact (a printed dash stays a dash). Nose/tail tip rocker for the picker's filter and sort and every
  quoted figure = this (ve9's P-6: the printed figure everywhere, so for a custom blank the printed figure as ordered).
- **`formatRockerNote(spec)`** → `-1/4"N18" +1/8"T36"` (amount as a 1/16" fraction, nearest; `fromTip` as a whole
  inch; nose first). **`parseRockerNote(text)`** reads it back (round-trips every formatted spec; reads every plain
  change in the 282 listing lines; named rockers, "another blank's curve" lines and anything it can't read → `null`).
  A shaper never types the note in this build; the reader is the formatter's proof and the later pick-list task's.
- **`blankDisplayLines(copy, spec?)`** → `["9'4\"B", "Natural" | note]` and **`blankDisplayName(copy, spec?)`** → the
  one line `9'4"B Natural` / `9'4"B -1/4"N18"`; with the vendor for the order form. Every reader of a blank's name
  goes through these, so ROCKER, the picker, the DATASHEET, the order form and the tile always agree.
- **`prepareBoardBlank(blank: BoardBlank): PreparedBlank`** = `withCustomRocker(prepareBlank(blank.copy),
  blank.rocker)` — the one helper every caller uses (see "What is true today").
- **Expected numbers come from a golden** (Rule 1): `scripts/extract-sketch016-custom-rocker-golden.mjs` runs the
  sketch's own `delta` / `floorOf` / `noteOf` / `parseNote` (extracted from `template.html`, as sketch 012's `curves.js`
  became the round nose's reference) over the sketch's two boards (`data.json`: the Longboard in the US Blanks 9'4"B,
  the Shortboard in the 6'3"RP) and a fixed set of changes — including `+1/2"N +1/2"N18"` (tip exactly 1" up) and
  `-2"T` (lands on the floor) — into `lib/geometry/__fixtures__/custom-rocker-golden.json`. The 282 listing lines are
  the reader's test set, verbatim. Never hand-transcribe an expected figure.
- **Units (Rule 2):** amounts and bend points are stored as `Mm`; every label through `units.ts` /
  `measure-display.ts` (amount = a mark, 1/16" or 1 mm; bend start = a dim, like a Thinning Start — in Metric the Bend
  starts slider still moves in whole inches, because the bend point is part of the maker's order code, and its label
  reads cm to one decimal; say so in a comment). The note's formatter is the one place an inch figure is shown to a
  Metric shaper, by the founder's decision. In Metric the Rocker slider steps 1 mm and the note rounds the amount to the
  nearest 1/16" (the drawing and tables show the stored figure) — record as P-1 for the founder.

## Storage

- **The board's copy of its blank** — `BoardBlank` (`lib/geometry/blank.ts:90`) gains `rocker?: BlankRockerSpec`.
  Absent = natural = every board saved today. **Snapshot rule 8** in `lib/models/design-snapshot.ts`: a strict, bounded
  schema for the spec (`.optional().catch(undefined)` like rule 6's Thinning Starts at :259 and rule 7's wings at
  :186), so a malformed spec reads natural and never rejects a board. **Version stays 5; no migration** for boards.
  `scripts/check-saved-boards.ts` stays green.
- **The shaper's saved blanks** — the one database change, additive: table `user_blanks` (`id` uuid default random
  primary key, `clerk_user_id` text not null + index — the `models` table's conventions at `lib/db/schema.ts:66`,
  `copy` jsonb not null (the base blank's catalogue row by value, as a board keeps its blank), `rocker` jsonb not null,
  `created_at` / `updated_at`). Migration `drizzle/0011_*.sql` from `npm run db:generate`; the development branch
  migrated inside the executor's worktree with `MIGRATE_ENV_FILE=/Users/kontoes/Code/shaper/.env.local npx
  drizzle-kit migrate` (the recipe that works; never read or print the env file; a read-only check after it).
  **Production is migrated by the founder BEFORE the deploy** (CLAUDE.md's rule for an additive change) — plan 03's
  go-live step hands them the commands. Server actions in `app/actions/user-blanks.ts` on
  `app/actions/fit-defaults.ts`'s shape (`await auth()` before any statement; a strict reader of the input — `copy`
  through the snapshot's `blankRecordSchema`, `rocker` through rule 8's schema; every statement filtered by
  `clerk_user_id`, `lib/db/ownership.test.ts`'s rule): save, update in place, remove, and the list read on the ROCKER
  page beside the catalogue (`app/design/rocker/page.tsx` streams `loadPickableBlanks()`; the shaper's blanks join it
  or stream beside it). A cap of 100 saved blanks per account (a 101st save is refused with a plain sentence). Account
  deletion (`lib/db/account-deletion.ts:34-36`) deletes the shaper's rows too — with a test.
- **Signed out, the browser keeps the list** — `lib/saved-blanks-preference.ts` + `components/saved-blanks-provider.tsx`
  on the stars' pattern (`lib/starred-blanks-preference.ts`, `components/starred-blanks-provider.tsx`: localStorage,
  `useSyncExternalStore`, an untrusted-value allow-list reader, a cap, no cookie). Key `shaper-saved-blanks`. Signed in,
  the account list is the list. **Joining a browser's saved blanks into the account on sign-in is NOT in this task** —
  it ships with ve9 part 2 together with the stars' join (stars are browser-only today; nothing on the account yet).
- **A saved blank's identity and star key:** vendor + `blankDisplayName(copy, spec)` (the one line, note included).
  **A natural blank's star key stays `[vendor, name]` exactly as today** — existing stars must keep working. Saving
  stars the blank under its key; editing a saved blank in place re-stars it under its new name (and drops the old
  key); unstarring later is the shaper's choice and never deletes the blank. Removing a saved blank drops its star.
- The `blanks` table and the CSVs stay the makers' printed figures. A saved blank is the shaper's, private to them.

## What to build — three plans, the founder's look between each, pictures before each merge

### Plan 01 — geometry and storage (no screen changes; every suite proves nothing moved)

`custom-rocker.ts` + tests + the golden script and fixture; the reader over the 282 lines; `BoardBlank.rocker`; rule 8;
`prepareBoardBlank` wired through every caller; the store's `setBlankRocker(spec | undefined)` (one undo step),
`pickBlank(record, placement, rocker?)` (a plain pick clears it — ruling 10), `removeBlank` unchanged in effect (the
hand-set rocker seeds from the bent profile as it is on screen; a tip below 0 clamps at 0 per `ROCKER_LIFT_RANGE_IN`,
as today); `user_blanks` schema + migration (dev branch migrated in the worktree) + actions + readers + the browser
store module; `blankDisplayLines` / `blankDisplayName` (not yet used by any screen). Gates: `npm test`, `npx tsc
--noEmit`, `npm run lint`, the full Playwright suite with `PW_PORT` set (nothing visible changed, so every spec and the
baseline pictures pass as they are).

### Plan 02 — the ROCKER screen complete: the Customize Rocker popup, the BLANK button, the VIEWER, the DATASHEET

- **The button** `Customize Rocker ›` / `Edit Custom Rocker ›` (`data-customize-rocker`) right under the blank card in
  `rocker-controls.tsx`'s BLANK section (above the fit flag and Remove This Blank); disabled when the board is locked
  (`useControlsLocked`). The BLANK button's name becomes two lines — `data-blank-name` keeps the name alone (every spec
  reads it), a new `data-blank-rocker` line reads `Natural` or the note.
- **The popup** — a Base UI dialog on `blank-picker-dialog.tsx`'s shell (its `DialogContent` classes at :216–221 and
  the phone/short-screen full-screen rules at :78–81: width `max-shell` and the inline `[@media(max-height:500px)]`
  height rule, never the pointer). Header "CUSTOMIZE ROCKER" / "EDIT CUSTOM ROCKER", the blank's name, the live note
  coloured (first changes in `--rocker-adjust-1`, second in `--rocker-adjust-2`), ✕. Body laid out like the ROCKER page
  (`design-screen-shell.tsx`'s pattern: rows column ~340 wide scrolling, drawing beside it; `max-shell`: drawing pinned
  on top with the page's height caps, rows scroll beneath; on a short screen the drawing column may scroll as the
  page's does). Rows per ruling 5 on `SliderRow` (`components/design/slider-row.tsx`), the Rocker and Bend starts
  sliders on one row, a Remove per change, ↺ Natural rocker, and one line: "The fit never changes — bending a blank
  leaves its thickness and width alone." Footer per ruling 9; primary = Use and save as a new blank.
- **The drawing** per ruling 7. Prefer reusing `RockerViewer` (`rocker-viewer.tsx:495`, zoom at :700) with an optional
  overlay/blank-only mode over a second drawing of the same foam; the planner measures which is honest. The overlay
  (natural dashed in the blank-line token, bend marks in the Thinning Starts mark's grammar, red/blue spans over deck
  and bottom) is drawn from **the same spec as the curve — one spec in, one drawing out** (the founder caught the
  sketch colouring the overlay from the board's rocker while the curve followed the draft; a unit test asserts the
  spans' stations against the spec). Blank-only mode: thickness chips on one rail, rocker-as-ordered chips on the
  other at the blank's five stations (the centre reads its levelled figure — 0 on nearly every blank), the natural
  figure small beneath where it differs; tips anchored outward, 12" stations inward, so neighbours never meet. Show my
  board on: the board in the blank with the page's own five stations. Zoom: the popup's own `ViewerZoomProvider` +
  `useViewerZoom(svgRef, baseViewBox, { touch: "pan" })` + `ViewerZoomControl placement="corner"`, strokes/dashes/type
  held at screen size (`zoomUnit`, `ScreenSizeGroup`, `zoomDashToken`) — `components/viewer/zoom-viewport.tsx`.
- **Two new colour tokens** in `app/globals.css`, light and dark, static in `@theme` (never inline):
  `--rocker-adjust-1` (Daylight `#c62828`, Slate `#f0625f`) and `--rocker-adjust-2` (Daylight `#1d5fd6`, Slate
  `#4f9cf5`) from the sketch — check each against both surfaces by hand (no AA test exists; a 1 px line wants ≥ 3:1)
  and record the figures in the plan. The warning colour is never used.
- **The page's VIEWER**: nothing new drawn (ruling 8) — the bent blank comes through `prepareBoardBlank`.
- **The DATASHEET** (`rocker-datasheet.tsx`): the BLANK group label carries the rocker line; a custom blank's block
  reads Natural Rocker (printed) / Custom Rocker (`customPrintedStations`) / Thickness / Width; a natural blank's
  block is unchanged; a footnote: the Custom Rocker row is the rocker as ordered — check it on the foam.
- **Store and saving:** Use and save as a new blank → `setBlankRocker(spec)` + save (account or browser) + star; Use
  and edit current blank → update the saved blank whose identity matches the board's blank (if none exists any more,
  save a new one) + `setBlankRocker`; Use the natural rocker → `setBlankRocker(undefined)`. One undo step for the
  board; saving never marks the board unsaved on its own beyond the rocker change.
- **Browser tests:** a new `e2e/rocker-custom.spec.ts` on a computer, an upright phone and a sideways phone: open the
  popup, set `+1/2"N`, bend at 18", add a second change (its cap), hit the floor, Show my board on/off, zoom, Cancel
  changes nothing, Use and save → the BLANK button's rocker line, the DATASHEET rows, Metric labels, a locked board.
  `e2e/helpers/blank-picker.ts` gains `customizeRockerButton` / `customRockerDialog`. The ROCKER desktop baseline
  re-records once (local, macOS only). Pictures (computer 1280×800, iPhone upright, Pixel 7 sideways, Daylight and
  Slate for the coloured overlay) into `<task dir>/pictures/02-*.png` from a scratch Playwright config.

### Plan 03 — the name everywhere, the saved blanks in the picker, the tile and the order form, go-live

- **PICK A BLANK:** a saved blank is a card (`blank-card.tsx`) under its base blank's verdict group (bending changes no
  width or thickness, so the verdict is the base's) and in ★ STARRED while starred — "Saved by you", its two-line name,
  Natural Rocker / Custom Rocker rows in its table, the custom tip in the nose-rocker filter and sort, the search
  matching its display name, a Remove (with its star). Picking it → `pickBlank(copy, placement, rocker)`. The natural
  blank stays listed. The list's prepared-blank cache (`use-blank-list.ts`) prepares a saved blank once through
  `withCustomRocker`.
- **The order form** (`components/summary/order-form.tsx:287–293`): `US Blanks 9'4"B Natural — centered` through
  `blankDisplayName`; `e2e/summary-blank.spec.ts` keeps proving ROCKER and the order form agree.
- **The screen tile** (`lib/geometry/screen-tiles.ts:266`): a second line under `On a 9'4"B` reading `Natural` or the
  note on every horizontal screen; on an upright phone only if it does not shrink the board drawing — measure, record
  the result, fall back to off (ruling 11).
- Anywhere else a blank is named by `copy.name` alone (grep `copy.name`, `copy.vendor`, `blankRowMeta`, `offerLine`
  in `blank-reasons.ts`, the rack card's tile line in `design.ts` / `summarizeDesign`) goes through the display helpers.
- **Go-live, on the founder's word:** every gate green on `main` after the merge (`npm run build` from the main
  checkout), then the founder runs `npm run db:migrate:prod` BEFORE the push that deploys (the orchestrator opens a
  terminal tab and hands them the commands; the classifier denies the orchestrator itself), then the push, then the
  live check. Pictures `03-*.png` before the merge.

### Later task — pick-lists (not here)

US Blanks' per-blank listings, Arctic's station tables, a "figures at stations" kind, a Rocker row on every picker
card, joining a browser's saved blanks into the account (with ve9 part 2).

## House rules that apply

- CLAUDE.md: Rule 1 (pure geometry, tested, golden fixtures by script), Rule 2 (every number through `units.ts` /
  `measure-display.ts`, dims vs marks, storage always metric), the three switches (width = layout via `max-shell`,
  pointer = control SIZE via `coarse:`, height = the inline short-screen rule — never conflated), phone chrome tightened
  under `max-shell` and the short-screen rule, the Database rule (additive → production migrated BEFORE the deploy).
- `coarse:` controls are 44-dot touch boxes; `SliderRow` already is one.
- `useControlsLocked()` — a locked board can open nothing that changes it; match today's `disabled={locked}` and
  `data-lock-exempt` on browse-only controls.
- Older Safari (the founder's iPad, Safari < 18.4): no CSS 3D, no scroll-driven animation.
- The sketch-findings skill (`.claude/skills/sketch-findings-shaper/`): the drafting grammar — one ink, meaningful
  dashes (stringer `16 4 4 4`, stations `5 4`), labels as SVG text on fixed rails, nothing but faint lines inside a
  board; the Thinning Starts mark's grammar for the bend marks; `references/blank-top-view.md` for the round nose.
- Catalogue and shaper text renders as React text only; a saved blank's `copy` is untrusted on read (the snapshot's
  `blankRecordSchema`, `isPickable`).
- Plain English in every commit message and the SUMMARY: what it does to the board or the screen.
- Executors in a worktree: `npm run build` cannot run there (use `npx tsc --noEmit`, `npm test`, `npm run lint`, the
  Playwright suite with a free `PW_PORT`, `IS_WEBPACK_TEST=1`); commit the SUMMARY inside the worktree; copy files
  outside the worktree via Bash only. The unit test `components/design/slider-row.test.ts` fails in THIS session
  worktree with a React `useId` error from a split `node_modules` (it passes 15/15 resolved from the main checkout's
  tree) — an environment artifact, not a code failure; an agent worktree with its own full `node_modules` is clean.

## What is true today (checked 2026-10-16, so you can confirm rather than explore)

- Geometry: `lib/geometry/blank-fit.ts` — `PreparedBlank` :116 (`record, lengthMm, centerThicknessMm, rocker:
  LevelledCurve, thickness, width`), `LevelledCurve` :93, `levelCurve(curve, from, to)` :110, `prepareBlank(record)`
  :192, `blankStationOf` :214, `floorCheck` :780, `blankTipRockers(prepared)` :825, `listBlanks` :1001, `nearestFit`
  :1046; `pchipMinimum` in `lib/geometry/pchip.ts:192`; `BlankSideView` in `lib/geometry/board-profile.ts:90`
  (`bottomAt`, `deckAt`); `formatSignedInchesFraction` in `lib/geometry/units.ts:312`; `blank-card-art.ts` is the
  picker card's pure drawing (D-14 precedent). `BoardBlank` :90 in `lib/geometry/blank.ts`.
- Callers of `prepareBlank` on a board's blank: `components/design/design-store.tsx:905` (`preparedBlank` memo over
  `blankCopy`), `lib/models/design-snapshot.ts:509`, `scripts/check-saved-boards.ts:255`,
  `scripts/extract-phase14-today-golden.ts:296`, `scripts/extract-phase14-preset-figures.ts:71`; `design.ts`'s
  `summarizeDesign` (the rack and summary) prepares through `DesignRules.prepare`. Catalogue-level callers
  (`use-blank-list.ts:74`, `blank-report-shared.ts`, the phase-11 golden) prepare records, not boards.
- Store: `pickBlank(record, placement)` :1052 (keeps fine-tunes, cut and Thinning Starts across a switch),
  `setThinningStart` :1152, `removeBlank` :1191, the "ten blank moves" comment at :43 and :177 lists what counts as an
  edit — add the eleventh there.
- Snapshot: `boardBlankSchema` :247 (`copy: blankRecordSchema` :239 with `isPickable`), rule-6 keys :259–260, wings
  :186; `DESIGN_SNAPSHOT_VERSION = 5` :121; the rules are documented in the file's header comment — add rule 8 there.
- ROCKER UI: `components/rocker/rocker-editor.tsx` (`RockerControls` :272, `TabbedPanel` :293, `RockerViewer` :386,
  `RockerDatasheet` :418; the VIEWER / DATASHEET tabs, TOP VIEW on a narrow or short screen); `rocker-controls.tsx`
  sections `center | blank | boardOnBlank | rocker (hidden with a blank — stays hidden) | thickness`, `SectionHeading`
  :154, `SliderRow`-based rows :177–310; `blank-picker.tsx` (the BLANK button: `data-blank-button`, `data-blank-name`
  :107, `blankRowMeta` :112, `[data-picked-blank]`); `blank-picker-dialog.tsx:127` (`BlankPickerDialog`; its header
  :225–250, filter bar :251, scrolling body :270); `blank-card.tsx` (`data-blank-card`, `data-group`,
  `data-nose-rocker-mm` :306); `use-blank-list.ts` (`useBlankList`, the WeakMap cache :74); `rocker-datasheet.tsx`
  (BLANK group of printed rows, YOUR BOARD, FOAM OFF; `printedBlankStations`; footnotes :248).
- Zoom: `components/viewer/zoom-viewport.tsx` — `ViewerZoomProvider` :150, `useViewerZoom` :221, `ScreenSizeGroup`
  :501, `zoomDashToken` :522, `ViewerZoomControl` :549, `useViewerZoomUnit` re-export :87. The FINS and OUTLINE
  viewers and `rocker-viewer.tsx:700` use it; the Wings popup (`components/outline/wing-dial-in-dialog.tsx`) is the
  "big popup" precedent the founder cited ("a similar effect as the Add Wings button").
- Stars: `lib/starred-blanks-preference.ts` (`STARRED_BLANKS_STORAGE_KEY = "shaper-starred-blanks"`, `STARRED_BLANKS_MAX
  = 500`, `StarredBlank = [vendor, name]`, `starKey`), `components/starred-blanks-provider.tsx` (`useStarredBlanks`).
  Browser-only today; the account column and the sign-in join are ve9 part 2, not built.
- Database: `lib/db/schema.ts` — `models` :66 (uuid id, `clerk_user_id` + index, jsonb, timestamps), `userPreferences`
  :85, `blanks` :113; migrations `drizzle/0000` … `0010_model_lock.sql`; `npm run db:generate` / `db:migrate` /
  `db:migrate:prod` in `package.json:14–16`; `lib/db/account-deletion.ts` :34–36 deletes `models` and
  `userPreferences` rows; `app/actions/fit-defaults.ts` :44–55 is the action shape (`auth()`, strict reader, upsert);
  `lib/db/ownership.test.ts` the ownership rule. The Neon development branch is what `.env.local` points at; executors
  migrate it with the `MIGRATE_ENV_FILE` recipe above; production is the founder's.
- Names today: `order-form.tsx:287–293` builds `${vendor} ${name} — centered | center …`; `screen-tiles.ts:266`
  builds `On a ${copy.name}`; `rocker-editor.tsx:243` passes `{ vendor, name, placement }` to the tiles.
- Browser specs that read a blank's name or the BLANK button (grep `pickedCard`, `data-blank-name`, `On a `,
  `— centered`): board-lock-screens, blank-picker, blank-makers, desktop-regression, new-board, phone-home,
  phone-screen-tiles, rocker-cut, rocker-blanks, rocker-top-view, rocker-live-controls, summary-blank, touch-drag,
  undo-redo, wings — plus `desktop-baseline.spec.ts`'s ROCKER snapshot (local only). `e2e/helpers/blank-picker.ts` is
  the one way tests pick a blank.
- Catalogue: 223 blanks, 219 pickable; under e2e `SHAPER_BLANKS_SOURCE=seed-csv`. Clerk never settles on the suite's
  fake keys, so the account path of saved blanks is proved by unit tests on the readers and actions plus the founder's
  own signed-in check; the browser path by Playwright.
- The sketch's numbers to reproduce: Longboard in the 9'4"B, natural nose tip 4 3/4"; `+1/2"N +1/2"N18"` → 5 3/4".

## Planner's choices to record for the founder (P-items in the SUMMARY)

- P-1 Metric: the Rocker slider steps 1 mm; the note rounds to the nearest 1/16" while the drawing and tables show the
  stored millimetre figure (the alternative — snapping the stored value to the sixteenth — makes a Metric slider jump
  by 1.6 mm). Confirm or overrule.
- P-2 The Bend starts slider in Metric moves in whole inches (the order code) with a cm label.
- P-3 Whether the popup reuses `RockerViewer` with an overlay mode or draws the foam with its own component on the
  same primitives — the planner's measured call.
- P-4 The screen tile's upright-phone result (ruling 11), measured.
- P-5 The saved-blank cap (100) and the browser store's cap.

## Not in this task

- Pick-lists and named rockers (US Blanks' listings, Arctic's tables, "figures at stations"); any change to the fit
  rules, the catalogue data, the `blanks` table or the CSVs; the stars' account column and the sign-in joins (ve9 part
  2); any change to TOP VIEW, the hand-set rocker (no blank) or the order form beyond its blank line.
