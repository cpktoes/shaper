---
phase: 18-a-guide-on-every-page
plan: 03
subsystem: guide
status: complete
tags: [guide, template, outline, wings, tails, rule-2, playwright]
requires:
  - "18-01: lib/geometry/guide-{card,push,draw}.ts, components/guide/guide-{copy,view,memo,tab,card,cartoon}, words/read-words-page.ts, e2e/helpers/guide.ts"
  - "18-02: the board's name in the strip (bandBoardName) and its room rule"
provides:
  - "lib/geometry/guide-outline.ts — TEMPLATE's 22 cards worked out from the open board (buildTemplateGuide, templateGuideVariants, TEMPLATE_GUIDE_CARD_IDS / _ORDER, TEMPLATE_GUIDE_PUSH_FIELDS, TemplateGuideInput)"
  - "lib/geometry/__fixtures__/guide-template-input.ts — the store's TEMPLATE inputs for a board (templateGuideInputFromFields, guideTemplateInput, guideTemplateInputWithWings)"
  - "components/guide/words/template.ts — TEMPLATE's words, held to the words page"
  - "components/guide/template-guide.tsx — TEMPLATE's GUIDE tab body"
  - "e2e/guide-template.spec.ts"
affects: [18-08, 18-09, 18-10]
tech-stack:
  added: []
  patterns:
    - "a control's limits in millimetres read from its own slider: measureSlider(value, rangeIn, stepIn, stepMm, system).toMm(view.max) — no inch conversion in a guide file"
    - "a push held inside the control's limits, else drawn the other way, else no push and no caption (D-26), decided once in templateGuideVariants"
    - "drawing labels kept off the board: a value or note in the detail's name band (right end), dimensions along the board in a band under it, vertical dimensions beyond the tail in a 94-unit gutter"
key-files:
  created:
    - lib/geometry/guide-outline.ts
    - lib/geometry/guide-outline.test.ts
    - lib/geometry/__fixtures__/guide-template-input.ts
    - components/guide/words/template.ts
    - components/guide/words/template.test.ts
    - components/guide/template-guide.tsx
    - e2e/guide-template.spec.ts
  modified:
    - components/outline/outline-editor.tsx
    - e2e/desktop-baseline.spec.ts-snapshots/outline-desktop-desktop-darwin.png
decisions:
  - "The Width card's window runs from the tail to 20\" past the wide point (the sketch's ran 20\" either side), so the width dimension stands beyond the tail with extension lines, off the board (D-08); the sketch's window cut the board at both ends and put the label over it"
  - "Angle, fullness and rail percentages, a wing's depth and corner radius, and the Depth note are written in the detail's name band, right end, rather than beside the curve as the sketch did: a label beside a tip clipped its window or sat on the board (D-08)"
  - "A locked wing's Offset push is placed by the app's own lock rule (lockedWingStation with the board's fin edges), since buildOutline places a wing by its station alone; the sketch's variant changed finOffset and drew an identical board"
  - "The Lock card reads Locked (an on tag, the ticked box) or Free (a value tag) per the UI-SPEC; Free draws the board as it is with no caption"
  - "+ Add a wing reads None yet (word tag), 1 wing or 2 wings (value tags); with one wing it pushes the second wing the button would add when there is room, with two it draws the board as it is"
metrics:
  duration: "about 3 h 30 min (most of it waiting on browser runs on a machine at load 450-1000)"
  completed: 2026-11-10
  tasks: 3
  commits: 5
  files: 9
actuals:
  tokens: 21000
  tasks: 3
  commits: 5
---

# Phase 18 Plan 03: TEMPLATE's GUIDE tab — Summary

TEMPLATE's strip now reads **VIEWER · ADD WINGS · GUIDE**. GUIDE opens 22 cards under Board Length, Nose Controls,
Widepoint Controls, Tail Controls and Wings. Each card has the open board's own value beside its name and the board's
outline drawn from above, nose left: the whole board in a strip, a dash-dot window on the part the control shapes,
and that part closer. The one setting is pushed in muted dashes through the app's own outline maths. Every card
carries the founder's two sentences and a *How to shape* note.

## What a shaper now sees on TEMPLATE

- **Three tabs, GUIDE last.** VIEWER and ADD WINGS (or WINGS · n) behave exactly as before; the sidebar stays the
  Template Builder while GUIDE is open. On a computer at 1280 the cards sit three across inside the folder.
- **On the Shortboard, Imperial**, every tag and caption equals the words page: Board Length `6'2"` / `dashed · 6'8"`;
  Nose Angle `50°` / `70°`; Fullness `20%` / `50% full`; Width `18 3/4"` / `19 3/4" wide`; Offset `-1"` / `+2"`;
  Tail Rail and Nose Rail `50%` / `80% long`; Squash `On this board`; Tail Block `4"` / `6" block`; Depth `Diamond &
  swallow only` / `as a swallow, 3" deep`; Tail Angle `55°` / `80°`; Fullness `45%` / `75% full`; + Add a wing `None
  yet` / `a 3/16" wing at 11"`; Position from tail `11"` / `15" from the tail`; Depth `3/16"` / `1/2" deep`; Vertical
  run `1/4"` / `1 1/2" run`; Corner radius `0"` / `7/16" radius`; Lock `Locked` / `+2" from the fin`.
- **Depth on a tail that has none** (squash, pin, round): tagged `Diamond & swallow only`, the window writes *no depth
  on a squash tail* (the board's own tail named) in its top band, above the board, and the board is drawn as the
  swallow preset in muted dashes with its 3" crotch dimensioned. On the Fish (a swallow) Depth reads its own
  `2 3/4"` and pushes to `3 3/4" deep`; on a diamond it reads the depth the outline allows and is never pushed past it.
- **Metric** (Shortboard): Board Length `188.0 cm` → `203.0 cm`, Width `47.6 cm` → `50.1 cm wide`, Tail Block
  `10.2 cm` → `15.2 cm block`, Depth `as a swallow, 76 mm deep`, + Add a wing `a 5 mm wing at 27.9 cm`, wing Depth
  `5 mm` → `13 mm`, Vertical run `6 mm` → `38 mm`, Corner radius `0 mm` → `11 mm`, Lock `+50 mm from the fin`. No inch
  or foot mark on any tag, caption or drawing label.
- **On a phone** the cards scroll one across inside TEMPLATE's pinned drawing area (66dvh, as it always was); the page
  never scrolls. At 360 wide the board's name stays whole beside the three tabs.
- **Nothing on a card can be pressed**, and nothing on it changes the board.

## The D-26 cases met on the fixture boards

| Board | Card | What it does |
|-------|------|--------------|
| Shortboard on a pin tail, on a round tail; the Midlength (round) | Tail Block | `—`, the board as it is, no caption, no dashes |
| Shortboard on a diamond tail | Tail Angle | `—`, the board as it is, no caption, no dashes |
| A diamond held short by its tail block (6" block, 4" deep) | Depth | deeper has no room (the outline keeps 2" off the block), so the push is drawn 1" shallower and the caption says `3" deep` |
| Midlength (round, 90°) | Tail Angle | 90° has no room up, so the push is drawn 25° the other way: `dashed · 65°` |
| Longboard (90° nose) | Nose Angle | the same: `dashed · 70°` |
| Shortboard with two wings | + Add a wing | `2 wings`, the board as it is, no caption |
| Longboard (a single fin: no front fin to lock to) | Lock | `Free`, the board as it is, no caption |

Every card's caption is `dashed` exactly when its drawing holds a push (a unit test checks all 22 cards on eight boards
in both systems).

## The desktop picture

`outline-desktop-desktop-darwin.png` re-recorded on purpose. **The one visible change is the word GUIDE in the tab
strip, after ADD WINGS** (244 pixels, at 664–707 × 106–111). 116 other pixels differ by at most 2 of 255 in one colour
channel — rendering noise, invisible. The old picture still passed Playwright's check (the faint tab word falls inside
its per-pixel colour tolerance and under the 100-pixel allowance), so it was re-recorded to keep the reference true to
the screen, then compared by hand against the old one.

## Tasks and commits

| Task | What | Commit |
|------|------|--------|
| 1 | TEMPLATE's 22 cards worked out from the open board (builder, fixture, unit test) | a05aebb3 |
| 2 | The GUIDE tab on TEMPLATE: words module and its test, tab body, editor touch, browser spec; the Width window fix | de1c421b |
| 3 | TEMPLATE's desktop picture re-recorded | 4a228ea8 |
| — | The builder test's whole-board checks given a minute (they ran past 5 s under load) | 007c5136 |

## Spec runs in this worktree (webpack dev server on 3113)

Final runs, made once the machine's load fell from 450–1000 to about 20:

| Spec | EXIT | Result |
|------|------|--------|
| `e2e/guide-template.spec.ts` (new) | 0 | 9 passed, 12 skipped: desktop 5, iphone 2, android 2 (the computer's and the phones' blocks skip on each other's projects) |
| `e2e/desktop-baseline.spec.ts --project=desktop` | 0 | 6 passed, TEMPLATE against its new picture (a run just before read 5 passed, 1 timed out at 30 s; re-run whole, 6 passed) |
| `e2e/board-name-band.spec.ts` | 0 | 17 passed, 16 skipped |
| `e2e/phone-screens.spec.ts` | 0 | 15 passed, 12 skipped |
| `e2e/phone-chrome.spec.ts -g TEMPLATE` | 0 | 8 passed, 16 skipped (18-06 owns the file this wave; not edited) |
| `e2e/wings.spec.ts` + `e2e/template-toolbar.spec.ts` | 1, then 0 | 61 passed, 1 failed, 109 skipped. The failure (android, Longboard placement B held sideways, `wings.spec.ts:1371`) was the home page's preset tap not reaching TEMPLATE; re-run alone, 2 passed, EXIT 0 |

Under the earlier load every one of these lost tests to page loads and server actions that ran past their timeouts.
The first band run also used a hand-started server without `SHAPER_RACK_STAND_IN`, so the practice rack read a 404.
None of those failures reached an assertion about TEMPLATE's strip or its GUIDE.

`outline-ghost.spec.ts` and `template-rails-panels.spec.ts` were not run: neither reads TEMPLATE's tab strip.

Unit suite (`npx vitest run`, under load): 189 files, 9685 passed, 76 failed, 2 skipped. All 76 were time limits:
32 at the 5-second default, plus the tests' own long allowances and two "under 250 ms" speed checks. The 13 files
re-run with `--testTimeout=180000` gave 3220 passed and 7 failed (time limits only). The last 4 of them
(`blank-fit`, `finished-rail`, `shaping-bay`, `rack-stand-in`) re-run on the quiet machine: **300 passed, EXIT 0**. So
every unit test passes. `guide-outline.test.ts` was one of the 76 at 5 s; it now has a minute and passes (13 tests).
`npx tsc --noEmit`: clean. `npm run lint`: 0 errors, the 1 warning that was already there
(`lib/db/import-designs-action.test.ts` `_calls`).

## Deviations from Plan

**1. [Rule 1 - Bug] The Width card's label sat on the board.** The sketch's wide-point window runs 20" either side of
the wide point, so it cuts the board at both ends and leaves no "outside the board" for the width's label (D-08). The
Width card's window now runs from the tail to 20" past the wide point, and the dimension stands beyond the tail with
extension lines from the wide point, as VOLUME's width does. Offset keeps the sketch's window. Commit de1c421b.

**2. Drawing labels moved off the curve.** The sketch wrote the angle, the fullness, the rail percentages and the Depth
note beside the curve. Beside a tip a label clipped its window; mid-board it sat on the board. They now sit in the
detail's top band at its right end, opposite the window's name. Dimensions along the board (length, offset, the
tail's depth, a wing's position and run) sit in a band under the board, and vertical ones (width, tail block)
stand beyond the tail. A unit test proves no label leaves its window or meets another at fits 0.7, 0.79 and 1.26, on
all four presets, a diamond, a pin, a round tail, and boards with one and two wings, in both systems.

**3. The Depth tag does not wrap to two lines at 236 dots.** The plan expected `Diamond & swallow only` to measure
277 dots and wrap in the narrowest card. Measured at 1200 wide (cards 236, room 212), the tag is **177** dots: it drops
under the name, right-aligned, on one line, with nothing cut off. The browser test asserts the rule (under the name,
right-aligned, never clipped, one or two lines) and records the measurement.

**4. The baseline picture passed before it was re-recorded.** See *The desktop picture* above. Re-recorded anyway,
and compared by hand.

**5. The locked wing's Offset push.** `buildOutline` places a wing by its station alone, so changing `finOffset` on a
locked wing (as the sketch's variant did) draws an identical board. The push places the wing by the app's own lock rule
(`lockedWingStation` with the board's fin edges). One pass, against the fins as they stand; the store's
`resolveWingStations` iterates as the fins move with the wing, a difference of a fraction of a millimetre on the
fixture boards.

**6. TDD order.** Task 1's test was written after the builder, not before. To show it can fail, the Depth tag was
broken on purpose and the test went red (2 failed), then it was restored.

**7. The fixture takes the fins too.** `DesignSummaryFields` carries no fins, and the wing cards need the front fins'
trailing edge. `templateGuideInputFromFields` takes `{ outline, fins, finsImportTemplate? }`, so `presetDesignFields`
fits it, and makes the store's memo calls in order.

## Shared files touched

None. `guide-card.ts`, `guide-push.ts`, `guide-draw.ts`, the `components/guide/guide-*` files, `read-words-page.ts`,
`metric-sayings.ts`, `app/globals.css`, `lib/units-isolation.test.ts`, `tabbed-panel.tsx`, `phone-chrome.spec.ts`,
`board-name-band.spec.ts` and `18-GUIDE-WORDS.md` are as wave 1 left them.

## For the orchestrator and plan 18-08

- `e2e/phone-chrome.spec.ts`'s `ALL_FIVE_SCREENS` row for TEMPLATE still reads `tabs: ["VIEWER", "ADD WINGS"]`, and
  its TEMPLATE describe (line 451) speaks of "two tabs". 18-08 adds GUIDE there. The rows only tap the tabs they
  list, so nothing breaks meanwhile.
- The words page and the app's maths agree on every TEMPLATE figure on the Shortboard; no sentence quotes a figure
  the maths disagrees with.
- A Metric shaper's TEMPLATE sentences still read the words page's Imperial phrases (`12"`, `3"`) until 18-07's
  sayings land; this plan's Metric checks cover tags, captions and drawing labels only, as the plan says.
- A 3/16" wing is about one unit deep in the 140-tall tail window, as it was in the sketch: visible on a phone, faint on
  the narrowest computer card. Worth the founder's look.
- Running a spec against a hand-started server needs every env value from `playwright.config.ts`'s `webServer.env`,
  `SHAPER_RACK_STAND_IN` and `SHAPER_FORCED_ERROR` included, or the rack's specs read a 404.

## Known Stubs

None. Every card draws from the store's board; nothing is a placeholder.

## Threat Flags

None. The GUIDE adds no network, storage or input path. The board's name reaches the intro as a React text child
only (T-18-01), and `buildTemplateGuide` runs only while GUIDE is open, memoised per board and system (T-18-02;
8–50 ms per build on the fixture boards under load).

## Self-Check: PASSED

All seven created files are present; commits a05aebb3, de1c421b, 4a228ea8 and 007c5136 are on
`worktree-agent-a21f10a241d8f179d`, followed by this summary's own commit.
