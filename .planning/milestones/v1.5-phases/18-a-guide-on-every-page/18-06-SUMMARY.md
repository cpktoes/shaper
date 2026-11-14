---
phase: 18-a-guide-on-every-page
plan: 06
subsystem: guide
status: complete
tags: [guide, fins, model-info, words-page, rule-2, playwright]
requires: ["18-01", "18-02"]
provides:
  - "lib/geometry/guide-fins.ts — FINS' 23 cards worked out from the open board's fins, setup by setup"
  - "components/guide/words/fins.ts — FINS' words, the fourteen Model info notes included"
  - "components/guide/fins-guide.tsx — FINS' GUIDE tab body"
  - "e2e/guide-fins.spec.ts"
affects: [18-08, 18-09, 18-10]
tech-stack:
  added: []
  patterns:
    - "a page whose cards share one drawing scale: every card's labels are packed into rows above and below the drawing first, then the scale is the largest the fewest rows leave room for"
    - "a removed screen's words kept as a fixed list in a test, proven equal to the file before the file was deleted"
key-files:
  created:
    - lib/geometry/guide-fins.ts
    - lib/geometry/guide-fins.test.ts
    - lib/geometry/__fixtures__/guide-fins-input.ts
    - components/guide/words/fins.ts
    - components/guide/words/fins.test.ts
    - components/guide/fins-guide.tsx
    - e2e/guide-fins.spec.ts
  modified:
    - components/fins/fin-placement-editor.tsx
    - components/viewer/tabbed-panel.tsx
    - lib/geometry/fins.ts
    - e2e/phone-chrome.spec.ts
    - e2e/volume-fins-panels.spec.ts
    - e2e/desktop-baseline.spec.ts-snapshots/fins-desktop-desktop-darwin.png
  deleted:
    - components/fins/fin-model-info.tsx
decisions:
  - "Every FINS card draws the tail at one shared scale per board and system, so one card can be compared with another; the scale is the largest that leaves rows above and below the tail for every card's labels"
  - "The setup and model captions are the fin maths' own model header (computeFinPlacement's modelHeader), so a caption always names what is actually drawn — McKee Longboard under eight feet reads 'Quad — McKee SB/Gun'"
  - "The fifth-box card draws behind McKee SB/Gun rears when the board's own rears are McKee Longboard, as the sketch did: the fifth box is not offered with the longboard rears"
  - "Off-Rail and Toe-In on a board with no rail fins (a single fin) tag '—' and push nothing; the base card is named by the page's own label, Fin Box Length"
metrics:
  duration: "about 3 h"
  completed: 2026-11-10
  tasks: 3
  commits: 5
  files: 14
actuals:
  tokens: 47000
  tasks: 3
  commits: 5
---

# Phase 18 Plan 06: FINS' GUIDE by fin setup, MODEL INFO folded in — Summary

FINS' strip now reads **VIEWER · DATA · GUIDE**. GUIDE opens 23 cards, setup by setup — the single fin, the twin and its
three templates, the thruster and its four front models, the 2+1, the quad with its four rear models and the fifth box,
then the four Advanced settings — each drawn on the open board's own tail, the fins as lines from trailing edge to
leading edge with the VIEWER's dots. The fourteen notes the MODEL INFO tab carried now sit, word for word, on the cards
they describe under a "Model info" label; the MODEL INFO tab and its file are gone.

## What a shaper now sees on FINS

- **Three tabs, VIEWER · DATA · GUIDE.** VIEWER and DATA are as they were. MODEL INFO is gone — no stub, no redirect.
- **23 cards in eight groups**, each heading with its qualifier: Inputs (1), Convention (1), Single Fin (1), Twin (4),
  Thruster (5), 2+1 (1), Quad (6), Advanced (4). No cant card. Each setup group opens with the setup's own card, then its
  templates or models in the sidebar's order, every name the app's own label (`Modern/Upright`, `Basic (Half Rate)`,
  `Basic - Spread`, `Basic - Off-Rail`, `McKee SB/Gun`, `McKee Longboard`, ...).
- **Every setup and model card is this board's fins with only that setup or model picked** (the advanced settings reset
  as the sidebar resets them), drawn on this board's tail with a caption naming what is drawn: on the Shortboard,
  `drawn as · Thruster — Basic (Half Rate)`, `drawn as · Twin — Keel`, `drawn as · Quad — McKee SB/Gun + Center
  (Five-fin)`, and so on. A quad model's card draws the front pair its rear model brings.
- **Tags, Shortboard Imperial** (all equal to the words page): Import Designed Board `On this board`; Trailing-edge
  convention `to 1/16"`; Thruster and Basic (Half Rate) `On this board`; McKee Longboard `Needs 8'0"` with its caption
  `drawn as · Quad — McKee SB/Gun` (the fallback the fin maths use); Fin Base Length `4 1/2"` (`dashed · 5 1/2" base`);
  Aft/Forward position `11"` (`dashed · 1" forward`); Off-Rail `1 3/16"` (`dashed · 7/8" off the rail` — the app holds the
  pushed fins at its 7/8" floor, so 1 3/16" less 1/2" reads 7/8", as the page says); Toe-In `1/4"` (`dashed · 1/2" toe-in`).
  The Fish is `On this board` on Twin and Modern/Upright.
- **Metric**: base `114 mm`, Convention `to 1 mm`, McKee Longboard `Needs 243.8 cm`, the window `Tail, 60.0 cm from above`;
  every fin figure in whole millimetres; no inch mark on any tag, caption or drawing label.
- **Fourteen Model info notes**, each between the card's two sentences and its How to shape, word for word the MODEL INFO
  tab's: Single Fin, Twin, Modern/Upright, Keel, Upright + Trailer, Proportional, Basic (Half Rate), McKee Shortboard,
  McKee Gun (the same sentence as McKee Shortboard, as the tab gave both one), 2+1, Basic - Spread, Basic - Off-Rail,
  McKee SB/Gun, McKee Longboard. Greg McKee is credited where the tab credited him.
- **The drawings**: the board from above in a strip with the tail's last 24" (60 cm) framed in dash-dot, the fins as
  short accent lines; under it that tail closer, open at the window's end as VIEWER draws it, the fins trailing to leading
  edge with the VIEWER's dots, a pair always one each side of the stringer. Off-tail is dimensioned under the tail at the
  fin's own station, off-rail beside its trailing edge, toe-in at the upper fin's leading edge against a dashed reference
  through its trailing edge, the base over the upper fin. Every label sits in a row above or below the tail — never on the
  board, on another label or on a fin dot. The Advanced cards draw the pushed fins in muted dashes over the board's own.
- **On a phone**: one card across; with GUIDE open the drawing area holds two thirds of the screen and the cards scroll
  inside it, the page itself never scrolls; back on VIEWER it pins at just over half, as before.

## The MODEL INFO sentence check, before the file went

`components/guide/words/fins.test.ts` first read `components/fins/fin-model-info.tsx` itself: the JSX it returned, tags
stripped, `&apos;` / `&quot;` / `&gt;` / `&amp;` decoded, each model's bold name and dash dropped, whitespace collapsed,
split at each full stop. It found the title and one-line note (`Model Info Reference note on where each model's placement
guidance comes from.`) and **24 sentences**; every one is on a FINS card's is, does or Model info line — the Convention
paragraph after exactly the two edits RESEARCH Finding 6 names (an *and* before *toe-in*, a capital *Rears* starting the
second sentence). That check ran green (10 tests) with the file present; the 24 sentences were then fixed as a list
inside the test, which still holds every one of them to the cards, and the file was deleted. **`components/fins/
fin-model-info.tsx` is removed in commit 50c03a36 — expect the deletion at the merge.** Nothing else imported it.

## Specs changed, and why

- **`e2e/guide-fins.spec.ts` (new)** — desktop: the strip's three tabs and no MODEL INFO tab; 23 cards in eight groups
  (1, 1, 1, 4, 5, 1, 6, 4) in order; fourteen `[data-guide-info]` blocks, each below its sentences and above its How to
  shape, reading the module's words; the Shortboard's tags and captions; every pair of fins one each side of the stringer
  on every card; the Fish On this board on Twin and Modern/Upright; Metric `114 mm`, `to 1 mm`, `Needs 243.8 cm` and no
  inch mark; at a window where the cards measure 236 to 245 dots, no text clipped, the Five-fin caption and Basic -
  Off-Rail's Model info wholly visible. iPhone and Android upright: one card across, no text cut off, the page never
  scrolls with GUIDE open (`scrollHeight === innerHeight`), the drawing area at most 66dvh, and VIEWER back at 55dvh.
- **`e2e/phone-chrome.spec.ts`** — FINS' rows only: the four `infoTab` locators are now `guideTab`
  (`getByRole("tab", { name: "GUIDE", exact: true })`), each still followed by `assertTabTouchBox(guideTab, bounds)`; the
  FINS entry of `ALL_FIVE_SCREENS` reads `tabs: ["VIEWER", "DATA", "GUIDE"]`. Nothing else in the file.
- **`e2e/volume-fins-panels.spec.ts`** — the "FINS' MODEL INFO — the side panel's own headings" describe is deleted (the
  tab it looked at is gone; the notes' look is proven by `e2e/guide-fins.spec.ts`), and its two comments that named MODEL
  INFO reworded.

## FINS' desktop picture, re-recorded on purpose

`fins-desktop-desktop-darwin.png`: I read the diff, then compared the old and new pictures region by region. **The only
change is the third tab's word — GUIDE where MODEL INFO was** (514 pixels, all inside the tab row; zero in the tail
drawing, the sidebar or the header). The tail, its fins, every dimension and every number are unchanged. The first
comparison also flagged faint anti-aliasing on the drawing's four dimension labels; measured, those pixels differ by less
than 16 of 255 between runs (the same text), and they come and go between two runs on this loaded machine. The other
five pictures were not re-recorded.

## Lines changed in the two files this plan may only touch in comments

`components/viewer/tabbed-panel.tsx` (comments only; 18-02's name rule untouched):

```diff
-   * MODEL INFO/ESTIMATE tab never moves the frame itself, only what's drawn inside it (P-4).
+   * GUIDE/ESTIMATE tab never moves the frame itself, only what's drawn inside it (P-4).
-            // DATASHEET/DATA/INSTRUCTIONS/MODEL INFO/ESTIMATE text never touches the frame line;
+            // DATASHEET/DATA/INSTRUCTIONS/GUIDE/ESTIMATE text never touches the frame line;
```

`lib/geometry/fins.ts` (the `finRoundingNote` comment only; the function stays — the order form and `fins.test.ts` use it):

```diff
- * `computeFinPlacement` never sees the shaper's system, so the display layer (the order form, and
- * FINS' MODEL INFO tab) appends this after the model notes. (quick 260928-vpi, Phase 13 item 8b)
+ * `computeFinPlacement` never sees the shaper's system, so the display layer (the order form)
+ * appends this after the model notes. (quick 260928-vpi, Phase 13 item 8b)
```

## Shared files touched

None. No line of 18-01's shared files (`guide-card.ts`, `guide-push.ts`, `guide-draw.ts`, `components/guide/guide-*`,
`read-words-page.ts`, `e2e/helpers/guide.ts`, `lib/units-isolation.test.ts`), `app/globals.css`, `18-GUIDE-WORDS.md` or
`e2e/board-name-band.spec.ts` changed. FINS' push amounts, the 24" / 60 cm window and the window's margins all come from
`guidePush`, `guideFrame` and `GUIDE_FRAME` as they were.

## Deviations from Plan

**1. [Rule 2] Every FINS card shares one drawing scale, and its labels go in rows above and below the tail.** The sketch
placed each dimension label beside the line it measures, which on the narrowest card (fit 0.7, labels about 9 units a
character) put `1 3/16" off rail` over a fin dot and the base label across the rail — the collisions UI-SPEC §13 names.
`guide-fins.ts` packs every card's labels into rows outside the tail's band (the band being the widest the tail gets in
its 24"), off-tail and off-rail below, toe-in, the base and the fifth fin's off-tail above, each slid along its row to
clear the others; it then draws the tail as large as the fewest rows that hold every card's labels allow, and the tail
tip where those rows fit (a search over a few positions). On the four presets that is one row above and two below.
`guide-fins.test.ts` proves no label overlaps another, a fin dot or its window, and none sits on the board, at fits 0.7,
0.79 and 1.26, on the four presets, both systems, Import Designed Board ticked and not. A build costs about 12-15 ms.

**2. [Rule 1] The tail is drawn open at the window's end, as VIEWER draws it.** The sketch drew the whole board clipped
by the window; FINS' own drawing is the tail's last 24" (the store's `finTailOutline`, or the generic tail curve when
Import Designed Board is unticked), so the card draws that, cut at 24" (60 cm in Metric), with the stringer.

**3. The fifth-box card on a McKee Longboard quad** draws behind McKee SB/Gun rears (the sketch's rule): the fifth box is
not offered with McKee Longboard's rears, so drawing the board's own would show no fifth fin.

**4. Off-Rail and Toe-In on a board with no rail fins** (the Longboard preset's single fin) tag `—` (the `na` tag
UI-SPEC lists) and push nothing; Fin Base Length is named `Fin Box Length` there, the page's own label
(`flags.centerBaseLenFieldLabel`). The words page shows only the Shortboard, so these are my reading of D-05.

**5. Two commits for Task 1** (a failing test, then the cards), as the plan's `tdd="true"` asks; the brief's "one per
task" counted these as Task 1's pair. Five commits in all with the SUMMARY.

**6. The words module was generated from the words page, not typed**, by a scratch script reading
`readGuideWordsPage()` and writing the TS literal; the words test then holds it to the page line for line.

**7. Three shared files still say "MODEL INFO".** `components/guide/guide-copy.ts` (two doc comments),
`components/guide/guide-card.tsx` (one doc comment) and `components/guide/words/volume.test.ts` (a test title and a
comment) are 18-01's shared files, which the brief says not to edit, so `grep -rln "MODEL INFO" e2e components lib app`
lists them beside the three files the plan expects (`words/fins.ts` — the FINS intro's own words —, `words/fins.test.ts`,
`e2e/guide-fins.spec.ts`). They describe the Model info notes, not a tab; plan 18-09's sweep can reword them.

## Notes for the orchestrator and plan 18-08

- **`components/fins/fin-model-info.tsx` is deleted** (commit 50c03a36); expect the deletion at the merge.
- **The words page and the maths agree on every FINS figure** the words quote for the Shortboard: `4 1/2"`, `5 1/2"`,
  `11"`, `1"`, `1 3/16"`, `7/8"`, `1/4"`, `1/2"`, `8'0"`. No words-page disagreement found.
- **Pushes not held to the sidebar's limits.** The Fin Base Length push adds 1" to every base, so a longboard single's
  10 1/2" box draws at 11 1/2", past the slider's 10 1/2" top; Aft/Forward adds 1" to whatever offset the board has, which
  could pass the slider's 1 1/2". The plan asks for the stated push; worth a look at the founder's review.
- **Metric prose** (the intro's `24"`, the Convention's `1/16"`, the Model info notes' inch ranges) is 18-07's sayings;
  until they land, a Metric shaper reads those few phrases in inches. `guideIntro(…, "fins")` already looks up
  `fins.intro`.
- **Browser tests and the dev server**: under this wave's load a cold webpack compile took 2-5 minutes and the suite's
  120 s web-server wait timed out, so I started the server on 3116 myself with the config's environment (all eight
  variables — the first start missed `SHAPER_FORCED_ERROR` and `SHAPER_RACK_STAND_IN`, which made the practice-rack rows of
  `board-name-band.spec.ts` fail until restarted) and let Playwright reuse it.

## Known Stubs

None. Every card is worked out from the store's board.

## Threat Flags

None. The GUIDE adds no network, storage or input path; the board's name reaches the intro as a React text child
(T-18-01); a build is 23 `computeFinPlacement` calls, memoised per board and system (T-18-02); the MODEL INFO sentences are
a fixed list in a test (T-18-05).

## Test results (this worktree, webpack dev server on 3116, the machine at load averages of 500-900 for most of it)

- `npx vitest run` (whole suite, once the load fell to about 30): 189 files, **9762 passed, 9 failed, 2 skipped**; the 9
  are timeouts, all in `blank-fit`, `board-surface-render`, `finished-rail` and `rack-art` (files this plan does not
  touch), and those four files pass alone with `--testTimeout=180000`: **631 passed**. This plan's own suites:
  `lib/geometry/guide-fins.test.ts` 20 passed, `components/guide/words/fins.test.ts` 9 passed, `components/guide` +
  `lib/units-isolation.test.ts` 66 passed, `lib/geometry/fins.test.ts` and `components/viewer` green.
- `npx tsc --noEmit`: clean. `npm run lint`: 0 errors, 1 warning that was already there
  (`lib/db/import-designs-action.test.ts` `_calls`).
- `e2e/guide-fins.spec.ts`: **4 passed on desktop** (1 skipped by project), **2 passed on iphone and android** (8 skipped
  by project).
- `e2e/phone-chrome.spec.ts -g FINS`: every FINS row green on all three projects (5 passed in one run; the three iPhone
  rows that timed out opening the page under load passed alone, 3 passed). An earlier wide run of the "All five screens"
  rows timed out opening TEMPLATE, ROCKER, RAILS and VOLUME as well as FINS under the same load (`gotoRoute`'s 15 s), not a
  FINS change.
- `e2e/volume-fins-panels.spec.ts`: **9 passed** (18 skipped by project).
- `e2e/board-name-band.spec.ts`: **13 passed**, then the 4 that ran out of time opening pages passed alone with a longer
  test timeout (**4 passed**). FINS' strip is narrower than before (GUIDE is a shorter word than MODEL INFO), so the
  name has more room on FINS, never less.
- `e2e/desktop-baseline.spec.ts --project=desktop`: FINS **passed** against its re-recorded picture (twice); ROCKER,
  RAILS and VOLUME passed. TEMPLATE failed on "screenshot never settled within 5 s" — its last frame matches the stored
  picture (66 pixels, none differing by more than 16 of 255) while an earlier frame mid-draw did not; and 3D's page timed
  out loading. Neither page is touched by this plan; both are worth a look in the orchestrator's merged run.

## Self-Check: PASSED

- Created files present: `lib/geometry/guide-fins.ts`, `lib/geometry/guide-fins.test.ts`,
  `lib/geometry/__fixtures__/guide-fins-input.ts`, `components/guide/words/fins.ts`, `components/guide/words/fins.test.ts`,
  `components/guide/fins-guide.tsx`, `e2e/guide-fins.spec.ts`; `components/fins/fin-model-info.tsx` absent.
- Commits present: 074a7041, c861d5ea, 50c03a36, d346839a (and this SUMMARY's).
