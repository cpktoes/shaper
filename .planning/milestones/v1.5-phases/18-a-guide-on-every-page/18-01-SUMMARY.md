---
phase: 18-a-guide-on-every-page
plan: 01
subsystem: guide
status: complete
tags: [guide, volume, tracer, words-page, rule-2, playwright]
requires: []
provides:
  - "lib/geometry/guide-card.ts — the card contract (ids, tags, captions, drawing primitives, roles)"
  - "lib/geometry/guide-push.ts — every page's push amounts and the sketch's inch frames, per system"
  - "lib/geometry/guide-draw.ts — strip and window fit, outline and section paths, dimensions, label boxes, overlap check"
  - "lib/geometry/guide-volume.ts — VOLUME's eight cards"
  - "components/guide/{guide-copy,guide-view,guide-memo}.ts, {guide-tab,guide-card,guide-cartoon,volume-guide}.tsx"
  - "components/guide/words/{read-words-page,volume,metric-sayings}.ts"
  - "e2e/helpers/guide.ts"
  - "--outline-push-line token"
affects: [18-03, 18-04, 18-05, 18-06, 18-07, 18-08, 18-09, 18-10]
tech-stack:
  added: []
  patterns:
    - "a page builder in lib/geometry/guide-<page>.ts returns a GuidePageBuild (Map of card id -> GuideCardModel); the component only paints"
    - "words module per page in components/guide/words/<page>.ts, held to 18-GUIDE-WORDS.md by an exact-equality test through readGuideWordsPage()"
    - "WeakMap memo keyed on a useMemo'd page input object, inner Map keyed on the units system"
    - "drawing text pinned at 10 screen dots by one fit measured in GuideTab and shared through GuideFitContext"
key-files:
  created:
    - lib/geometry/guide-card.ts
    - lib/geometry/guide-push.ts
    - lib/geometry/guide-draw.ts
    - lib/geometry/guide-volume.ts
    - lib/geometry/__fixtures__/guide-volume-input.ts
    - components/guide/guide-copy.ts
    - components/guide/guide-view.ts
    - components/guide/guide-memo.ts
    - components/guide/guide-tab.tsx
    - components/guide/guide-card.tsx
    - components/guide/guide-cartoon.tsx
    - components/guide/volume-guide.tsx
    - components/guide/words/read-words-page.ts
    - components/guide/words/volume.ts
    - components/guide/words/metric-sayings.ts
    - e2e/helpers/guide.ts
    - e2e/guide-volume.spec.ts
  modified:
    - components/volume/volume-estimator.tsx
    - app/globals.css
    - lib/units-isolation.test.ts
    - e2e/phone-chrome.spec.ts
    - e2e/desktop-baseline.spec.ts-snapshots/volume-desktop-desktop-darwin.png
decisions:
  - "A section card (Center Thickness, Length-Weighted Effective Thickness) fits the centre cross-section to the detail's width, true to scale, rather than the sketch's 12-inch window zoom, which drew the section as a sliver; its strip window is still the sketch's"
  - "Dimension labels sit outside the board in reserved gutters (a name band at the top of a detail, a label band under a plan, an 84-unit gutter to the right), sized for 10-dot text on the narrowest card"
  - "GuidePrim text and dim carry an optional dy (in ems) so a label below a line clears it at any text size"
  - "Two drawing labels shortened from the sketch so they fit the narrowest card at 10 dots: '51 cross-sections' (was '51 cross-sections, every 1 7/16\"') and 'Center cross-section' (was 'Center cross-section, from RAILS')"
metrics:
  duration: "about 2 h 45 min"
  completed: 2026-11-09
  tasks: 3
  commits: 4
  files: 29
actuals:
  tokens: 40000
  tasks: 3
  commits: 4
---

# Phase 18 Plan 01: VOLUME's GUIDE — the tracer, and the shared GUIDE pieces — Summary

VOLUME's strip now reads **ESTIMATE · GUIDE**; GUIDE opens eight cards, each with the open board's own number beside its
name, a small drawing of that board (the whole board from above with a dash-dot window, then the plan or the centre
cross-section closer), the founder's two sentences and a *How to shape* note — and on Board Length, Board Width and Center
Thickness that number pushed in muted dashes through the app's own outline and rail maths, captioned with the pushed figure
and the litres the quick estimate would then read.

## What a shaper now sees on VOLUME

- **Two tabs, ESTIMATE then GUIDE.** ESTIMATE reads exactly as before. On a computer the GUIDE's cards sit three across at
  1280, scrolling inside the folder.
- **Eight cards in two groups**, *Inputs* (with its qualifier, "the three sliders and Board Type show only when Import
  Designed Board is unticked") and *What the ESTIMATE card reads*. On the Shortboard, Imperial: Import Designed Board `On
  this board`; Board Length `6'2"`, `dashed · 6'8" → 31.8 L quick estimate`; Board Width `18 3/4"`, `dashed · 19 3/4" →
  31.0 L quick estimate`; Center Thickness `2 1/4"`, `dashed · 2 1/2" → 32.7 L quick estimate`; Board Type `Balanced`;
  Estimated Volume `29.61 L` (the 51 cross-sections — never the quick estimate's 29.41); Template Area `1042.8 sq in`;
  Length-Weighted Effective Thickness `1 1/2"`. Every one equals the words page's own example.
- **Metric**: `188.0 cm`, `dashed · 203.0 cm → 31.8 L quick estimate`, `47.6 cm`, `5.7 cm` (`dashed · 6.2 cm → 32.0 L`,
  the push half a centimetre), `6728 cm²`, `38 mm`; three sentences read their Metric sayings (below); no inch mark on any
  card.
- **Nothing on a card can be pressed** and nothing on it changes the board.
- **On a phone** GUIDE pins the drawing area at two thirds of the screen; the cards scroll inside it, the page never
  scrolls, the controls sit beneath. Back on ESTIMATE the page is the one scrolling column it always was. Held sideways,
  the desktop layout draws and the drawing column scrolls the cards.

## The shared contract as built — what wave 2 must use

Build to these; do not edit them (they are the contract the four page plans share). Deviations from the plan's
`<interfaces>` block are marked **(added)**.

**`lib/geometry/guide-card.ts`** — exactly the interfaces block, plus:
- `guideText(text)` and `guideFigure(text)` **(added)**: make `GuideTextPart`s. Every formatted number goes in a
  `guideFigure(...)` part so the painter keeps its unit out of the capitals.
- `GuidePrim` `dim` and `text` carry an optional **`dy?: number` in ems (added)** — the label's baseline shift, so a label
  under a line or hung under a frame's top edge clears it at any text size.
- The role vocabulary is complete for all five pages (board, shade, foam, baseline, station, frame, stringer, widepoint,
  window, cut, mark, thinning, push, extension, reference, fin, rail, railFill, band, apex); no wave-2 plan needs a role.

**`lib/geometry/guide-push.ts`** — `guidePush(system)` returns `{ rocker, template, rails, volume, fins }`, every amount
already in millimetres for the system (degrees / percent / ratio / scale as bare numbers). Keys: rocker `center tips skin
startIn startPastAutomatic fine rocker bend bendFrom`; template `length angle full width offset rail block depth tailAngle
wingPos wingDepth wingRun wingOffset`; rails `thick deckPercent scale ratioTop apex deckMark domedBand tuck1 tuck3 blends`;
volume `length width thick`; fins `finBase finForward finOffRail finToe`. **(added)** `GUIDE_PUSH_TABLE` (each entry's
family, inches and Metric mm — the test reads it) and `guidePushAmount(entry, system)`. `GUIDE_FRAME.{template, rails,
volume, fins, rocker}` holds every inch frame the sketch's cartoons use, in mm, with the sketch line each came from;
`guideFrame(system).finsTailWindow` is 24" / 60 cm. The ROCKER bend and bend-from are `inchesToMm(1/2)` and
`inchesToMm(18)` in both systems (`formatRockerNote` prints them). `startIn` and `startPastAutomatic` are two pushes: the
ROCKER builder takes whichever is further in, and clamps it.

**`lib/geometry/guide-draw.ts`** —
- `GuideMap` is `{ k, kx, ky, ox, oy }` with `guideX(map, s)` / `guideY(map, a)` **(added)**; a plan nose left has a
  negative `kx`, a section standing on its bottom a negative `ky`.
- `guideStripFit(length, wideWidth, stripHeight)`; `guideDetailBox(stripHeight, detailHeight)` **(added)**: the detail box
  8 in from each side, 6 under the strip.
- `guideWindowFit(win, strip, box, { stripHeight, top?, bottom? })` — the fourth argument **(added)** gives the strip's
  height for the clamp and the detail's top and bottom gutters (default 7 + 7, the sketch's `hDet − 14`). The window is
  centred in the band the gutters leave; the returned `rect` is the window on the strip, 3 beyond it, clamped inside
  `guideStripInset(stripHeight)` **(added)**. A whole-board window takes the inset box top to bottom (a short, wide board
  fits the strip by height, so it does not always span it side to side).
- `guideHalfWidthAt`, `guideOutlinePath(points, map, centreCloseStation?)` (third argument **added**: closes a swallow's
  crotch / a diamond's tip to the stringer).
- `guidePlanPrims(geometry, map, role = "board", reach = 4)` **(added)** — the closed outline plus, unless it is the push,
  the stringer; `role` `"shade"` for a shaded board, `"push"` for the dashed variant.
- `guideSectionPath(railSamples, halfWidth, map)` **(added)** — a whole cross-section from one finished rail's own samples
  (`finishedRail(...).samples`), mirrored across the stringer.
- `guideVDim(x, ya, yb, parts, side)`, `guideHDim(xa, xb, y, parts, above, anchor)`, `guideWindowName(box, parts)`
  **(added — a window's name in its top-left corner)**.
- `guideTextBox(prim, fit)`, `guideLabelOverlaps(figure, fit)` (pairs of label indices, and `[i, -1]` for a label outside
  its window), `guideFigureBounds(figure)`; constants `GUIDE_STRIP_MARGIN`, `GUIDE_STRIP_BAND`, `GUIDE_DETAIL_GAP`,
  `GUIDE_WINDOW_INSET`, `GUIDE_TEXT_UNITS_MAX` (10 dots on the narrowest card, 14.3 units — size every label band by it).

**Components** —
- `components/guide/guide-copy.ts`: `GUIDE_COPY` (`tab`, `onThisBoard`, `howToShape`, `modelInfo`, `regionLabel(page)`),
  the `GuideWordsCard` / `GuideWordsGroup` types, `guideBoardName`, `guideLines(card, system)`, and
  `guideIntro(template, system, { board, blank? }, page?)` — the fourth argument **(added)** looks up the page's own
  Metric intro sayings under the key `${page}.intro`. Placeholders in an intro are `{board}` and `{blank}`.
- `components/guide/guide-view.ts` **(the plan names it; its export is `guideView(groups, words, build, system)`)**: returns
  `GuideViewGroup[]` (`{ key, name, note, cards: GuideViewCard[] }`) and throws when a words card has no built card.
  A card's `name` is the builder's `model.name` when set, else the words page's.
- `components/guide/guide-memo.ts`: `memoGuide(cache, key, system, build)`. Key it on a **`useMemo`'d page input object**
  (VOLUME's `VolumeGuideInput`), not a single store object: VOLUME's cards read the outline, the rails and the litres too,
  and keying on `effectiveVolume` alone would keep a stale drawing when Import Designed Board is unticked and the outline
  changes.
- `components/guide/guide-tab.tsx`: `<GuideTab page intro groups />` — the one scroller (`data-guide`, `role="region"`,
  `aria-label` `Guide to {Page}`, `tabIndex={0}`, `print:hidden`), the intro, `<section data-guide-group={guideSlug(group
  name)}>` per group, and the one `ResizeObserver` providing the fit to every cartoon through `GuideFitContext`.
- `components/guide/guide-card.tsx`: `<GuideCard card />`, memoised, `data-guide-card={id}`, `data-guide-on`,
  `data-guide-tag={kind}`, `data-guide-caption={kind}`, `data-guide-text`, `data-guide-info`, `data-guide-how`.
- `components/guide/guide-cartoon.tsx`: `<GuideCartoon figure />` and `GuideFitContext`. Paints in a fixed order: fills
  (board, shade, foam, railFill), reference lines, push, dimensions, text. Each window gets its own clip and its frame
  (rx 3); builders never add the frame themselves.
- A page component (like `volume-guide.tsx`) reads the store with one `const { … } = useDesign()` of values only (the
  source test fails on an action), builds the input with `useMemo`, then `memoGuide` → `guideView` → `<GuideTab>`.

**Words** — `components/guide/words/<page>.ts` exports `<PAGE>_GUIDE_INTRO` (`{board}` where the page says Shortboard),
`<PAGE>_GUIDE_GROUPS` (`{ name, note }`, the note the words after the first ` — ` of the heading) and `<PAGE>_GUIDE_WORDS`
(`GuideWordsCard[]`, id `guideCardId(page, group, name)`). Copy each line from the words page; `volume.test.ts` is the
pattern for the page's own test (`readGuideWordsPage()` returns `{ raw, pages, cards, metricSayings }`; each page has
`intro`, `groups`, `cards` with `tag` and `caption` as the page writes them, or `null`). The reader already parses a
`## Metric sayings` section in the format the plan gives (`### PAGE`, then `- {Group} › {Card name} · {field}:
\`{imperial}\` → \`{metric}\`` or `- intro: \`…\` → \`…\``), so 18-07 needs no reader change.
`components/guide/words/metric-sayings.ts` holds `GUIDE_METRIC_SAYINGS` keyed by card id (or `${page}.intro`), each
`{ field, imperial, metric }`.

**E2E helper** — `e2e/helpers/guide.ts`: `dismissStrips`, `setMetricUnits`, `openPreset(page, presetId, screenLabel)`,
`openGuide(page, count)`, `guide`, `guideCards`, `guideCard(page, id)`, `columnsAcross(page, groupSlug)`,
`readGuideCards(page)` (`nameMeetsTag` only counts a tag on the name's own line, since a long name now drops its tag under
it). It imports only lib files and the words / copy modules — never `site-nav.tsx`.

**Rule 2 ledger** — `lib/units-isolation.test.ts` ends with a describe walking every non-test `.ts`/`.tsx` under
`components/guide` and every `lib/geometry/guide-*.ts`: no `format{InchesFraction, FeetInches, SignedInchesFraction,
Centimetres, WholeMm}`, `mmToInches`, `mmToCentimetres`, raw `25.4` / `2.54`, and `inchesToMm` in `guide-push.ts` only. A new
page's builder that needs an inch figure reads it from `GUIDE_FRAME` or `guidePush`.

**Source test** — `components/guide/guide-source.test.ts` holds every file under `components/guide` (recursively): no raw
HTML, no `Math.sin…`, no `window.` / `document.` / `matchMedia`; nothing pressable, no handler and no `tabIndex` in
`guide-card.tsx` or `guide-cartoon.tsx`; `tabIndex={0}` in `guide-tab.tsx` only; and each `*-guide.tsx` destructures from
`useDesign()` only names the store hands out as values. (Checked: adding `onClick` to `guide-card.tsx` fails it.)

## The Metric sayings VOLUME carries (first drafts for the founder's pen)

| Card | Line | Imperial | Metric |
|------|------|----------|--------|
| Board Length | does | an inch of length is worth less than an inch of width | a centimetre of length is worth less than a centimetre of width |
| Center Thickness | does | a quarter inch at the centre is about two litres on a shortboard | half a centimetre at the centre is about three litres on a shortboard |
| Length-Weighted Effective Thickness | how | tail 12" | tail at 30.5 cm |

**For the founder:** by the app's own quick estimate on the Shortboard, a quarter inch at the centre is **3.3 L**
(29.41 → 32.68), not "about two"; half a centimetre is 2.6 L, so the Metric saying, worked out from the maths as the plan
asks, reads "about three". The words page's Imperial line is left exactly as written (it is his); the two now differ in
the figure they quote. Worth a look at the review.

## Specs changed, and why

- **`e2e/guide-volume.spec.ts` (new)** — desktop: the strip's tabs, eight cards in two groups, a drawing on every card,
  Board Length's push in `var(--outline-push-line)`, the words in order; nothing pressable and a click changes nothing
  (ESTIMATE then quotes the GUIDE's own litres); Metric Board Length and no inch mark. Phones: one across, no text cut
  off, the document never scrolls with GUIDE open (`scrollHeight === innerHeight`), the pinned column at most 66dvh + 1
  and the card at least 66dvh − 41, no sideways scroll, every note scrolled into view, ESTIMATE restores the page
  scroller; sideways: the desktop shell, the last note reachable.
- **`e2e/phone-chrome.spec.ts`** — VOLUME's describe rewritten ("two tabs" instead of "a label"): ESTIMATE is found by
  `getByRole("tab", { name: "ESTIMATE" })`. Measured on the phones: tab top **11** under the top bar (was 2 for the
  label), tab **22** tall (was 20–23 for the label), reading area **11** under the tab (was 10), side and bottom margins
  **13** (unchanged), sideways bottom clearance **13** (unchanged); the ESTIMATE and GUIDE tabs both pass
  `assertTabTouchBox` upright and sideways. Drawing area: 364 × 366.9 on a 390 × 844 iPhone, 386 × 366.9 on a 412 × 915
  Android, 466 × 285 sideways on an iPhone, 475.5 × 255 on an Android. `ALL_FIVE_SCREENS`' VOLUME row is now
  `tabs: ["ESTIMATE", "GUIDE"]` (its comment updated; nothing else in the list).
- **`e2e/phone-screens.spec.ts`** — run, all green, **left untouched** (ESTIMATE keeps `phonePinned="none"`).
- **VOLUME's desktop picture** (`volume-desktop-desktop-darwin.png`), re-recorded after reading its diff: the **GUIDE tab
  appears beside ESTIMATE**, and the **strip is one dot taller**, so everything in the ESTIMATE card sits one dot lower.
  The one dot is ESTIMATE becoming a real tab: it was a 29-dot label and is now a 30-dot tab like every other page's (the
  "computer is untouched" rows of `phone-chrome.spec.ts` already require 30). No figure, word or colour in the picture
  changed. The other five pictures pass untouched.

## Test results (this worktree, webpack dev server on 3111)

- `npx vitest run`: 187 files, 9739 passed, 2 skipped. `npx tsc --noEmit`: clean. `npm run lint`: 0 errors, 1 warning
  that was already there (`lib/db/import-designs-action.test.ts` `_calls`).
- `e2e/guide-volume.spec.ts`: 7 passed on iphone, android and desktop (8 skipped by project).
- `e2e/phone-chrome.spec.ts -g VOLUME`: all VOLUME rows green on every project (the iPhone upright row timed out once on a
  cold first compile and passed alone).
- `e2e/phone-screens.spec.ts`: 15 passed. `e2e/volume-fins-panels.spec.ts`: 10 passed.
- `e2e/desktop-baseline.spec.ts --project=desktop`: 6 passed after the VOLUME picture was re-recorded.
- VOLUME-touching phone specs (`old-safari-buttons`, `imported-readout`, `touch-sizing`, `step-nav`, iphone + android):
  76 passed, EXIT 0.
- `e2e/board-name-band.spec.ts`: 4 failed, all the expected red below; 8 passed.

## Deviations from Plan

### Auto-fixed / adjusted

**1. [Rule 1 - Bug] The words test's markup check would fail on the founder's own FINS words.** The plan asks that no card
line on the page hold `**`, `<` or `>`. FINS' Keel *Model info* (the MODEL INFO tab's words, verbatim) reads "Use for wide
base (generally > 5 1/2"), retro-style twin fins." So VOLUME's lines are held to no `**`, `<` or `>` at all, and every
other page's to no `**` and no `<` or `>` touching a character (anything that could open or close a tag); a `>` standing
alone between spaces passes. Words page untouched. Commit aa09c6ef.

**2. [Rule 1 - Bug] Two sketch drawing labels did not fit the narrowest card at 10 dots.** `51 cross-sections, every 1
7/16"` and `Center cross-section, from RAILS` run 330+ units at the narrowest fit (0.7) in a 284-wide detail; they read
`51 cross-sections` and `Center cross-section`. Drawing labels, not the founder's card words. `guide-volume.test.ts`
proves no label collides or leaves its window at fits 0.7, 0.79 and 1.26 on all four presets. Commit b42d5ce1.

**3. [Rule 1 - Bug] The sketch's centre cross-section was a sliver.** Through the sketch's window zoom the Shortboard's
section drew about 87 × 10 units in a 284 × 110 box, the 1/4" push about one unit. The section card now fits the section to
the detail's width (true to scale, `computeRailSectionOutput` + `finishedRail` both sides): about 192 × 26 units, the push
about 3. The strip's dash-dot window is still the sketch's (6" either side of the middle, 1" beyond the rail). Dimension
lines moved outside the board (D-08, "no text inside a board"): the width dim beyond the tail with extension lines, the
length dim under the board, the thickness dims right of the rail. Commit b42d5ce1.

**4. [Rule 2] Caption figures never break across a line.** On a computer `31.0 L` split as `31.0` / `L`; figure spans in
the caption now carry `whitespace-nowrap`. Commit b42d5ce1.

**5. Interface additions** (marked **(added)** above): `guideText`, `guideFigure`, the `dy` field, `GuideMap`'s shape and
`guideX`/`guideY`, `guideWindowFit`'s fourth argument, `guideStripInset`, `guideDetailBox`, `guidePlanPrims`,
`guideSectionPath`, `guideWindowName`, `guideOutlinePath`'s third argument, `GUIDE_PUSH_TABLE`, `guidePushAmount`,
`guideIntro`'s fourth argument, `VOLUME_GUIDE_CARD_ORDER`, `volumeGuidePlan`. Nothing in the block was removed or renamed.

**6. The tracer's own memo key.** The plan says VOLUME's memo keys on `effectiveVolume`; it keys on the `useMemo`'d
`VolumeGuideInput` (see guide-memo above) so an outline edit while unticked redraws the plan.

## Expected red in this worktree (fixed by 18-02 at the merge)

`e2e/board-name-band.spec.ts` — red in this worktree for VOLUME's strip height only, fixed by 18-02 on merge: **p1**
("upright: on every screen the name fits beside the tabs…") and **p2** ("held sideways: the same on every screen…"), on
both `iphone` and `android`, each failing only at `VOLUME …: the band's height is unchanged` (expected 21, received 31).
Every other screen's rows in those tests passed before the VOLUME row; the file was not touched.

## Known Stubs

None. Every card draws from the store's board; nothing is placeholder.

## Threat Flags

None. The GUIDE adds no network, storage or input path; the board's name reaches the intro as a React text child only
(T-18-01), and the source test keeps it that way.

## For the wave-2 executors

- Run `npx next typegen` in a fresh worktree, then the browser specs with `IS_WEBPACK_TEST=1 PW_PORT=<yours>`; the first
  webpack compile of a page can time out a first test — re-run that spec alone.
- Size label bands by `GUIDE_TEXT_UNITS_MAX` (14.3 units): drawing text is 10 screen dots on every card, which is 14.3
  units on the narrowest. Add your page's builder to a `guideLabelOverlaps(figure, 0.7) === []` test, as
  `guide-volume.test.ts` does — it is what caught the two long labels above.
- `readGuideWordsPage().pages` returns all five pages; hold your module to your page by order, as `volume.test.ts` does.
- A card's name that follows the board goes in the builder's `model.name`; the words keep the page's name.

## Self-Check: PASSED
