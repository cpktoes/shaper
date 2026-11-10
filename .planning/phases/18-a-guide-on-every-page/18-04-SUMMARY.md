---
phase: 18-a-guide-on-every-page
plan: 04
subsystem: guide
status: complete
tags: [guide, rocker, side-view, blank, rule-2, playwright, tab-strip]
requires:
  - phase: 18-01
    provides: the GUIDE card contract, pushes, frames, drawing helpers, GuideTab/GuideCard/GuideCartoon, the words reader and e2e helpers
  - phase: 18-02
    provides: the board's name giving way under 50 dots of room on a tab strip, and ROCKER's eleven captions on the words page
provides:
  - "lib/geometry/guide-rocker.ts — ROCKER's fourteen cards worked out from the open board through designSideProfile"
  - "components/guide/words/rocker.ts — ROCKER's words, held to the words page"
  - "components/guide/rocker-guide.tsx — ROCKER's GUIDE tab body"
  - "GUIDE last on both of ROCKER's tab lists"
affects: [18-07, 18-08, 18-09]
tech-stack:
  added: []
  patterns:
    - "a side-view GUIDE card: the board in its blank across a 50-unit strip, one or two 84-unit detail windows at one height scale, every push through designSideProfile"
    - "drawing labels placed by trying each side of a dimension at the narrowest card's text size, keeping the first that stays inside its window and clear of every other label"
key-files:
  created:
    - lib/geometry/guide-rocker.ts
    - lib/geometry/guide-rocker.test.ts
    - lib/geometry/__fixtures__/guide-rocker-input.ts
    - components/guide/words/rocker.ts
    - components/guide/words/rocker.test.ts
    - components/guide/rocker-guide.tsx
    - e2e/guide-rocker.spec.ts
  modified:
    - components/rocker/rocker-editor.tsx
    - components/rocker/rocker-live-controls.ts
    - components/rocker/rocker-live-controls.test.ts
    - e2e/desktop-baseline.spec.ts-snapshots/rocker-desktop-desktop-darwin.png
decisions:
  - "A rocker push adds to the change the board already orders from the same point (the centre, or 18\" in for the bend), else to its last change when the end already holds two, else orders a new change; at 2\" it takes the inch off instead"
  - "A 12\" fine-tune push goes up unless the board already tweaks that station up, then down, so it always stays inside the slider's quarter inch either way"
  - "The Deck Skin push sets the skin to 1/2\" (13 mm); where the skin is already that deep it goes half an inch deeper, up to the slider's own limit (measureSlider over FIT_DEFAULTS_RANGE_IN.deckSkin)"
  - "Pin tips to cards label the foam off 3\" in from each tip as a bare mark: \"1/4\\\" off the bottom\" is 160 units wide at the narrowest card, wider than a pair's 138-unit window"
  - "The Blank card's window keeps an extra label's height under its baseline for \"3/8\\\" off the bottom\"; the centre window is drawn to its width, so the board draws no smaller for it"
  - "A hand-set board (no blank, a fresh ROCKER) draws all fourteen cards: the blank's cards push nothing and show no tag or caption, Nose and Tail Rocker push the typed tip lift"
metrics:
  duration: "about 1 h 45 min"
  completed: 2026-11-10
  tasks: 3
  commits: 5
  files: 11
actuals:
  tokens: 46000
  tasks: 3
  commits: 5
---

# Phase 18 Plan 04: ROCKER's GUIDE Summary

ROCKER's strip now ends in **GUIDE**: fourteen cards in four groups. Each card shows the open board from the side,
inside its own blank, the way VIEWER draws it, with that one setting pushed in muted dashes. Every pushed board comes
from the app's own side-profile maths with just that setting changed.

## What a shaper now sees on ROCKER

- **The strip:** on a computer it reads **VIEWER · PLANING · DATASHEET · GUIDE**. On a phone, or a narrow or short
  window, it reads **VIEWER · TOP · PLANING · DATA · GUIDE**. GUIDE is in both lists, so widening or narrowing the
  window across 820 dots with GUIDE open keeps it open (proven at 1280 → 800 → 1280). Every sidebar control stays live
  while GUIDE is open.
- **The intro** names the board and its blank: "…drawn from your Shortboard in its US Blanks 6'3"RP blank…"
- **Fourteen cards** under Inputs, Blank, Rocker ("read off the blank — hand-set until you pick one") and Foil.
  Each card's drawing works the same way:
  - **The top strip** shows the whole board inside its foam, standing on the dashed line its rocker is measured from,
    with both thinning marks and a dash-dot window.
  - **Underneath**, that part of the board is drawn closer: one window, or two side by side for a pair (Nose Tip ·
    Tail Tip, Placement, both Pin tips to cards, the two 12" fine-tunes, Fine tune from). The number the control sets
    is dimensioned the way VIEWER reads it.
- **On the Shortboard in Imperial**, every tag and caption equals the founder's words page:
  - Tags: `2 1/4"`, `7/16" · 15/16"`, `US Blanks 6'3"RP`, `centered`, `1/8"`, `Natural rocker`, `4 1/4"`, `1 9/16"`,
    `On this board` (Pin tips to · Deck only), `12" · Automatic` twice, `No tweak`, `Deck`.
  - Captions: `+1/2" at the center`, `+3/8" at each tip`, `slid 9/16" to the nose`, `1/2" skin`, `+1/2"N18"`,
    `+1" nose rocker`, `+1" tail rocker`, `starts 24" in` twice, `+1/4" at both`, `-1/4" at the tail 12"`.
- **In Metric** the tags read `57 mm`, `11 mm · 24 mm`, `3 mm`, `107 mm`, `40 mm` and `30.5 cm · Automatic`. The
  fine-tune card is named `Nose @ 30.5 cm · Tail @ 30.5 cm`. The pushes read `+13 mm`, `+10 mm`, `14 mm`, `13 mm skin`,
  `+25 mm`, `60.0 cm in` and `+6 mm`. Only the blank's name and the maker's rocker note (`+1/2"N18"`) carry an inch
  mark, as CLAUDE.md Rule 2 asks.
- **When the app's own limits leave no room (D-26):**
  - **Placement:** a board already slid to the nose end of its blank is slid to the tail instead, and the caption
    says so. In a blank with no room either way, the board is drawn as it is, with no caption.
  - **Rocker change:** a nose change already at 2" comes an inch off instead (`-1" nose rocker`). An end never holds
    more than two changes.
  - **Thinning Start:** one already at the end of its reach moves toward the tip instead, and never leaves its range.
- **A fresh, hand-set board** (no blank picked) still gets all fourteen cards. The blank's cards push nothing and show
  no tag or caption. Nose and Tail Rocker push the typed tip lift by an inch.

## The board's name on ROCKER's strip, measured (the orchestrator's question)

A saved board from the practice rack carries the fullest phone strip (VIEWER · TOP · PLANING · DATA · GUIDE).
Measured with GUIDE on the strip, the room is what is left after the last tab:

| | 360 | 375 | 390 | 412 | 430 |
|---|---|---|---|---|---|
| room after GUIDE (iPhone and Pixel, identical) | 1.8 | 16.8 | 31.8 | 53.8 | 71.8 |
| board's name | not drawn | not drawn | not drawn | drawn, box 47.8 | drawn, box 65.8 |

That matches 18-02's prediction exactly (1.8 / 16.8 / 31.8 / 53.8). All five tab words stay whole on one line at every
width, and the page never scrolls sideways. None of the five rooms sits within 2 dots of the 50-dot line.

**Held sideways — a real finding, left for its owner:**

| | iPhone 844×390 | Pixel 7 863×360 |
|---|---|---|
| ROCKER's strip | VIEWER · TOP VIEW · PLANING · DATASHEET · GUIDE (full words: wider than 820) | the same |
| room after GUIDE | **41.7** | **51.2** |
| board's name | **not drawn** | drawn, box 45.2 |

Before GUIDE, ROCKER had 111.8 dots of room held sideways; GUIDE takes about 70. On an iPhone held sideways the name
now gives way, so **`e2e/board-name-band.spec.ts` test p2 ("held sideways… a sideways phone has the room for the
name") fails on the iphone project at ROCKER**. The Pixel clears the line by only 1.2 dots. As ruled, neither the rule,
`components/viewer/tabbed-panel.tsx` nor the band test was changed. The band test's own run is recorded below.

## The desktop picture

ROCKER's picture (`rocker-desktop-desktop-darwin.png`) is re-recorded on purpose. Compared pixel by pixel with the old
one, **244 dots differ, every one inside one box (775–818 across, 102–112 down): the word GUIDE after DATASHEET.** The
board, the sidebar and every label are untouched. The old picture still passed, inside the comparison's 100-dot
allowance and its colour threshold, so it was re-recorded with `--update-snapshots=all`. RAILS, VOLUME, FINS and 3D pass
unchanged.

## Deviations from Plan

**1. [Rule 1 - Bug] A pair's window is too narrow for "off the bottom".** "1/4" off the bottom" is 160 units wide at the
narrowest card, but a pair window is 138. The Pin tips to cards label the foam off with the bare mark. The window's
name and the card's words say which surface. Commit a2b66e50.

**2. [Rule 1 - Bug] The Blank card's "3/8" off the bottom" had nowhere to sit.** The label left its window at every
fit. That window now keeps a label's height under its baseline. Commit a2b66e50.

**3. Fine-tune window names.** The sketch named the pair windows `Nose @ 12"` / `Tail @ 12"`. In Metric, `NOSE @ 30.5 CM`
in tracked capitals is 148 units, wider than the 138-unit window. The windows read `Nose 12"` / `Nose 30.5 cm`
(through `stationLabel`). The card's own name is the page's, `Nose @ 12" · Tail @ 12"` / `Nose @ 30.5 cm · Tail @ 30.5 cm`.

**4. Labels sometimes sit over the board's lines.** Every label stays inside its window and clear of every other label
(the test), but a few sit over a board or foam line: the tip rocker and tip thickness figures beside a tip, Placement's
spare, and the Customize Rocker rise. The sketch did the same at its smaller 8-unit text. The founder's look (18-09) is
the place to judge it.

**5. A fine-tune push that would leave the slider's range.** The plan says `+ push` at both 12" stations. The slider
reaches ±1/4" and the push is 1/4". So a station already tweaked up is pushed down instead, and the caption then names
each station's push (`+1/4" at the nose · -1/4" at the tail`). The Shortboard reads the page's `+1/4" at both`.
Fine tune from does the same (`+1/4" at the tail 12"` when the tail is already tweaked down).

**6. The Thinning Start window grows with the push.** The sketch used a 34" window. GUIDE_FRAME has no 34" frame, so
the window is the 30" tip span, or the pushed start plus the tip inset plus 3", whichever is longer. A start at 24"
reads 32 1/2". No inch is named outside `guide-push.ts`.

**7. The hand-set intro word.** With no blank, the intro's `{blank}` reads `hand-set` ("…your board in its hand-set
blank…"). This is a gap the words page does not cover, and is for the founder's pen.

**8. An extra test commit.** A fresh ROCKER board has no blank (it showed in the desktop picture). Its cards are tested
in commit c4c213c5.

**TDD note:** Task 1 is `tdd="true"`. The builder and its test went in one `feat` commit, with no separate failing-test
commit first (as in 18-02).

**Words:** every sentence is the words page's, copied by a script from `readGuideWordsPage()` and held by
`words/rocker.test.ts`. No figure in a ROCKER sentence was checked against the app's maths by this plan: ROCKER's
sentences quote no worked-out litres or heights. The page and the plan never disagreed.

## Shared files touched

None. `guide-card.ts`, `guide-push.ts`, `guide-draw.ts`, the components under `components/guide/` (other than the new
`rocker-guide.tsx` and `words/rocker*`), `e2e/helpers/guide.ts`, `lib/units-isolation.test.ts`,
`components/viewer/tabbed-panel.tsx`, `e2e/phone-chrome.spec.ts`, `e2e/board-name-band.spec.ts` and
`18-GUIDE-WORDS.md` are as they were. `guide-rocker.ts` imports `FIT_DEFAULTS_RANGE_IN` from
`lib/fit-defaults-preference.ts`, which is pure, for the Deck Skin slider's limit.

## Test results

<!-- filled below -->

## For the orchestrator and plan 18-08

- **The sideways band:** `board-name-band.spec.ts` p2 on the iphone project fails at ROCKER. The room is 41.7 and the
  name is not drawn. This is the rule working as written on a strip GUIDE made fuller. Choosing whether a sideways
  phone should keep the name (shorter tab words held sideways, or a looser p2) is the founder's call and plan
  18-06/18-08's file.
- **phone-chrome.spec.ts** was not run for ROCKER's rows here (18-06 owns the file this wave, 18-08 owns ROCKER's rows).
- **TEMPLATE's desktop picture** failed twice in this worktree, 4104 dots each time, as a sub-pixel shift of the drawing's
  labels and handles. Nothing is visibly different and no TEMPLATE file was touched. It passed on this worktree's first
  run. 18-03 owns that picture this wave.

## Known Stubs

None.

## Threat Flags

None. The blank's and board's names reach the intro and the Blank tag as React text only (T-18-01, held by
`guide-source.test.ts`). The fourteen side profiles take about 30 ms in all on a cold start and are kept per board and
system (T-18-02).
