---
phase: 18-a-guide-on-every-page
verified: 2026-11-10T15:19:36Z
status: passed
human_verified: "2026-11-10 — the founder tried the live site on his phone and ruled on the name (leave it off), the speed (fast enough) and the inch code (keep it); recorded in 18-10-SUMMARY.md. The words and the screen-reader caption stay his with no deadline (a to-do of 2026-11-14 carries the caption)."
score: 15/15 must-haves verified (R13, the go-live, is pending by design in plan 18-10 and is not counted)
behavior_unverified: 0
overrides_applied: 0
human_verification:
  - test: "The founder's look: open TEMPLATE, ROCKER, RAILS, VOLUME and FINS on his own phone (upright and sideways) and on a computer, tap GUIDE, and read the cards. The pictures in pictures/ are the same thing on paper."
    expected: "Every page ends in a GUIDE tab; each card shows his own board with one setting pushed in dashes, two sentences and a How to shape note; nothing is cut off; nothing on a card can be pressed."
    why_human: "How a drawing reads and whether the words are right are his to judge. Every sentence and How to shape note is a first draft for his pen (18-GUIDE-WORDS.md)."
  - test: "D-21, the board's name on a crowded strip. Look at rocker-strip-360/390/430/820.png and rails-strip-360/390/430/820.png."
    expected: "Either he accepts that the name is not drawn on ROCKER below about 412 dots and RAILS below about 400 (and on both in an 820-dot window), or he asks for shorter phone tab words to bring it back."
    why_human: "This changes his own rule of 2026-10-08 (Untitled whole at 360) on ROCKER and RAILS. It is recorded in CLAUDE.md and pictures/README.md as his to overrule."
  - test: "D-28, how fast a GUIDE opens on a slow phone. Read 18-TIMING.md."
    expected: "A decision: accept 219 to 270 ms on a slowed phone (about 340 ms on FINS after the label fix), or ask for the cards to be drawn only as they scroll into view."
    why_human: "Four of five pages are over D-28's 150 ms line with the processor slowed four times and lazy drawing was not built. Recorded as a departure put to him, not decided for him."
  - test: "MD-02, the Customize Rocker card in Metric."
    expected: "A word on whether the maker's inch order code (+1/2\"N18\") may show on a GUIDE card for a Metric shaper, and if so CLAUDE.md Rule 2's list of places gains the GUIDE."
    why_human: "Rule 2 allows the maker's order code in inches in named places; the GUIDE is not yet one of the named places. Recorded in 18-REVIEW-FIX.md."
  - test: "LW-05, the caption under each drawing for a screen reader."
    expected: "A word on whether the caption (dashed, +1/2\" at the center) should be read aloud; today the drawing and its caption are hidden from a screen reader together."
    why_human: "An accessibility choice recorded in 18-REVIEW-FIX.md for his word."
  - test: "Plan 18-10, the go-live gate (R13): the whole test suite, lint, the build, every browser test, the push to main, the live site, his look on his phone."
    expected: "All green and the GUIDE live on shaperassistant.com."
    why_human: "Not run yet, by design. This verification did not run Playwright, a build or a dev server; the gate does."
---

# Phase 18: A GUIDE on Every Page — Verification Report

**Phase goal:** every design page a shaper sets numbers on (TEMPLATE, ROCKER, RAILS, VOLUME, FINS) ends in a GUIDE tab: one card per control, each the shaper's own board drawn with that one setting pushed in muted dashes, two sentences on what it is and does, and a How to shape note. FINS' MODEL INFO tab is gone and its words sit on the cards. A GUIDE only reads the board.

**Verified:** 2026-11-10, branch `page-guides` at `2f76616c`
**Status:** human_needed — nothing is missing or broken in the code; what is left is the founder's look, four recorded decisions that are his, and the go-live gate.
**Re-verification:** No — first verification.

## How this was checked

- The code was read, not the summaries. Every verdict below points at a file and line or a named test.
- I ran the GUIDE's own unit tests once: 21 files, 305 tests, all passed. The type check passed with no output. (`npx vitest run lib/geometry/guide- components/guide components/viewer/tabbed-panel.test.ts lib/units-isolation.test.ts components/rocker/rocker-live-controls.test.ts`; `npx tsc --noEmit`.)
- I did not run the browser tests, a build or a dev server, on the orchestrator's instruction (the go-live gate is using this checkout). For anything only a browser can show (how many cards sit across, the page not scrolling, the name's slot on the strip) I read the browser test files to see exactly what they assert, and relied on three things for the result: the orchestrator's record that the six GUIDE browser specs passed on `83cafbcd` (51 passed, 63 skipped by project); the checkout's own `test-results/.last-run.json`, which reads `"status": "passed", "failedTests": []` and was written six minutes after that commit; and the fact, checked here, that no code outside `.planning/` has changed since `83cafbcd`. I also looked at three of the fifty pictures. Those truths are marked "browser" below so the difference is plain.

## Goal achievement

### Observable truths

| # | Truth | Status | Evidence |
|---|---|---|---|
| 1 | R1 — GUIDE is the last tab on all five pages; FINS has no MODEL INFO tab | VERIFIED | TEMPLATE `components/outline/outline-editor.tsx:125-129`; ROCKER both tab rows `components/rocker/rocker-editor.tsx:105-129`; RAILS `components/rails/rail-band-editor.tsx:341-346`; VOLUME `components/volume/volume-estimator.tsx:54-57`; FINS `components/fins/fin-placement-editor.tsx:20-23` (VIEWER, DATA, GUIDE only). Browser: `e2e/guide.spec.ts` "every strip ends in GUIDE, FINS has no MODEL INFO". Picture `fins-guide-computer.png` shows it. |
| 2 | R2 — 84 cards (22, 14, 17, 8, 23) under the sidebar's own headings, in order | VERIFIED | Counted by hand on `18-GUIDE-WORDS.md`; `components/guide/guide-words.test.ts` "the 84 cards in the founder's order"; `lib/geometry/guide-pages.test.ts` "gives the page's own cards, in the words page's order" on every fixture board. |
| 3 | R3 — each card's tag is this board's own value and follows the board | VERIFIED | Tags come from the board passed in, through the page's own formatters: `words/{template,rocker,rails,volume,fins}.test.ts` and `guide-outline.test.ts:63-66` hold all Shortboard tags to the words page; `guide-volume.test.ts` "tags Estimated Volume with the store's quoted litres". Browser: `e2e/guide.spec.ts` "the cards follow the board: a slider moved redraws its card". |
| 4 | R4 — each card draws the shaper's board with one setting pushed in muted dashes, and never says "dashed" with nothing dashed (D-26) | VERIFIED | `lib/geometry/guide-pages.test.ts` "says dashed exactly when something is dashed" for all five pages on at least twelve kinds of board in both systems; painter `components/guide/guide-cartoon.tsx`. Picture `rocker-guide-phone.png` shows the dashed push and its caption. |
| 5 | R5 — the pushed drawing and its number come from the app's real maths | VERIFIED | Builders import and call the page's own functions: `buildOutline` (`guide-outline.ts`), `designSideProfile` (`guide-rocker.ts`), `computeRailSectionOutput` + `finishedRail` (`guide-rails.ts`), `computeVolume` (`guide-volume.ts`), `computeFinPlacement` + `resetAdvanced` + `isQuadRearModelAvailable` (`guide-fins.ts`). Tests: `guide-rails.test.ts` "draws each pushed rail as finishedRail(computeRailSectionOutput(...))"; `guide-fins.test.ts` "draws each card's fins as computeFinPlacement gives them"; `guide-volume.test.ts` "the litres computeVolume gives that variant". |
| 6 | R6 — the words on every card are the words page's, line for line; 14 Model info notes | VERIFIED | `components/guide/words/read-words-page.ts` reads `18-GUIDE-WORDS.md` without tidying a character; each page's `words/*.test.ts` "card for card, in order: id, group, name, is, does, info and how"; `guide-words.test.ts` "exactly fourteen Model info notes, all on FINS"; `metric-sayings.test.ts` "an Imperial shaper still reads every line exactly as the page writes it". |
| 7 | R7 — a GUIDE only reads the board; nothing on a card can be pressed | VERIFIED | `components/guide/guide-source.test.ts`: "puts nothing pressable or focusable on a card or in its drawing" and "takes no action from the design store"; `guide-pages.test.ts` "never writes the board it is given: a deep-frozen board builds" (five pages). Browser: `e2e/guide.spec.ts` "pressing a page's first card changes no value in its sidebar". |
| 8 | R8 — three, two, one cards across as the window narrows, none under 236 dots; on a phone one across, the cards scroll inside their folder and the page never scrolls | VERIFIED (browser) | Grid rule `components/guide/guide-tab.tsx` (`minmax(max(236px, ...))`, `overflow-y-auto`); pinned height `rail-band-editor.tsx:291`, `volume-estimator.tsx:83`. Browser: `e2e/guide.spec.ts` "three cards across at 1280, two at 1024, one at 820" and "upright ... one card across, the page never scrolls, the pinned area holds 66dvh"; "held sideways". |
| 9 | R9 — FINS' GUIDE runs setup by setup; the MODEL INFO file is gone and no sentence of it is lost; no cant card | VERIFIED | `components/fins/fin-model-info.tsx` does not exist; `words/fins.test.ts` "no sentence of the MODEL INFO tab is lost". I compared that test's 24 sentences against the deleted file on `main` (`git show main:components/fins/fin-model-info.tsx`) and they match. Eight groups on the words page, no card named cant. |
| 10 | R10 — Depth is shown as a diamond's or a swallow's setting only | VERIFIED | `guide-outline.test.ts` "on a squash, pin and round tail says Depth is a diamond's or a swallow's, and draws the board as a swallow"; "on a diamond reads the depth the outline allows, and never pushes past it"; `words/template.test.ts` "the Depth card's words say it belongs to a diamond or a swallow alone". |
| 11 | R11 / Rule 2 — a Metric shaper reads no inch or foot figure on any card, and every conversion goes through `lib/geometry/units.ts` | VERIFIED | No `25.4` in any guide file; `inchesToMm` appears only in `lib/geometry/guide-push.ts`, imported from `./units`; `lib/units-isolation.test.ts` "no GUIDE file names a banned formatter or converter, or a raw inch factor" and "only lib/geometry/guide-push.ts may call inchesToMm"; `guide-pages.test.ts` "shows no inch or foot figure in Metric" (five pages); `metric-sayings.test.ts` "all 84 cards, every line". Picture `template-guide-computer-metric.png` reads 188.0 cm and 203.0 cm. The one exception, the maker's rocker order code, is MD-02 (recorded, his word). |
| 12 | R12 — nothing else on any page moves | VERIFIED (code footprint) | `git diff main...HEAD` outside `.planning/`: 14 existing source files touched, all of them the five tab strips, the shared tab strip, one new colour token, comments, and the deleted MODEL INFO file. No change to the design store, the database, presets or any existing calculator. Five desktop reference pictures re-recorded on purpose (each now shows the GUIDE tab). The check that those pictures still match is part of the gate's full browser run. |
| 13 | D-21 — the board's name is drawn only when its own strip has room, decided by the strip and not by the window, the pointer or the height | VERIFIED | `components/viewer/tabbed-panel.tsx`: a container query on the strip's own trailing slot (`@container` ... `@max-[50px]:hidden`). `tabbed-panel.test.ts` "moves the 6-dot gap inside the slot, so it gives way with the name" and "leaves a strip with no trailing slot as it was". Browser: `e2e/guide.spec.ts` "at 360, 375, 390, 412 and 430 on a phone and 820 on a computer" reads the room off the strip itself. |
| 14 | Rule 1 — no formula sits in a component | VERIFIED | All drawing and number work is in `lib/geometry/guide-*.ts` (no React, browser or database import in any of them); `guide-source.test.ts` bans `Math.sin/cos/tan/atan/sqrt/pow/hypot` and `window`/`document` in `components/guide`. The only arithmetic in a component is the painter's text size divided by the drawing's fit. |
| 15 | Plan 18-09 — pictures for the founder's look, an index in plain English, and the CLAUDE.md paragraph | VERIFIED | `pictures/` holds 50 PNGs and `README.md` naming each and the ruling it puts to him (D-21, D-22, D-25); CLAUDE.md's Layout section carries the "GUIDE is the last tab" paragraph. |

**Score:** 15 of 15 truths verified. R13 (checks, pictures and go-live) is pending in plan 18-10 and is not counted.

### The things the orchestrator asked me to look for

| Look-for | Finding |
|---|---|
| A card whose words differ from the words page with no test catching it | None found. Words, tags and captions on the Shortboard in Imperial are held to the page on all five pages. Two small notes are in "Notes" below (three board-following names, one out-of-date test title). |
| A GUIDE that can write to the board | None. No handler, button, link or input on a card; each `*-guide.tsx` takes only values from the design store, enforced by a test that parses the store's own type. |
| A conversion by 25.4 or 10 outside `lib/geometry/units.ts` | None. The four `Math.round(v * 10) / 10` helpers named `f1` (`guide-draw.ts:136`, `guide-fins.ts:576`, `guide-rails.ts:353`, `guide-rocker.ts:395`) round drawing coordinates to a tenth of a dot; they do not touch a board dimension. |
| A formula inlined in a component | None. |
| FINS still showing MODEL INFO | No. The only places the words appear are the GUIDE's intro and tests asserting the tab is gone. |
| A page whose GUIDE tab is not last | None, including both of ROCKER's tab rows. |
| The name-slot rule reading window width, pointer or height | No. It is a container query on the strip's own slot. |

### Required artifacts

| Artifact | What it provides | Status |
|---|---|---|
| `lib/geometry/guide-card.ts`, `guide-draw.ts`, `guide-push.ts` | the card contract, shared drawing helpers, the push amounts | VERIFIED — exist, substantive (176, 575, 287 lines), imported by all five builders |
| `lib/geometry/guide-{outline,rocker,rails,volume,fins}.ts` | the five builders | VERIFIED — 735, 1135, 681, 403, 796 lines; each called from its `*-guide.tsx` |
| `components/guide/{guide-tab,guide-card,guide-cartoon}.tsx`, `guide-view.ts`, `guide-copy.ts`, `guide-memo.ts` | the tab, the card, the painter | VERIFIED — rendered by all five pages |
| `components/guide/{template,rocker,rails,volume,fins}-guide.tsx` | each page's GUIDE | VERIFIED — each mounted by its editor when the GUIDE tab is active |
| `components/guide/words/*.ts` | the words modules and the words-page reader | VERIFIED — held to `18-GUIDE-WORDS.md` by tests |
| `components/viewer/tabbed-panel.tsx` | the strip and the name's slot | VERIFIED |
| `components/fins/fin-model-info.tsx` | must be gone | VERIFIED — deleted |
| `e2e/guide.spec.ts`, `e2e/guide-{template,rocker,rails,volume,fins}.spec.ts`, `e2e/helpers/guide.ts` | browser proof | VERIFIED as present and substantive (read, not run) |
| `pictures/README.md` + 50 PNGs | the founder's look | VERIFIED |

### Key links

| From | To | Via | Status |
|---|---|---|---|
| each editor's tab list | its `*Guide` component | `activeTab === "guide"` render (`outline-editor.tsx:409`, `rocker-editor.tsx:446`, `rail-band-editor.tsx:592`, `volume-estimator.tsx`, `fin-placement-editor.tsx:162`) | WIRED |
| each `*-guide.tsx` | its builder in `lib/geometry` | `memoGuide(..., () => buildXGuide(input, system))` | WIRED |
| each `*-guide.tsx` | the design store | one `useDesign()` call, values only | WIRED (read-only, test-enforced) |
| words modules | `18-GUIDE-WORDS.md` | `readGuideWordsPage()` in tests | WIRED |
| `guide-view.ts` | words + built card | throws if a words card has no built card | WIRED |
| builders | `lib/geometry/units.ts` | formatters in `measure-display.ts`; `inchesToMm` only in `guide-push.ts` | WIRED |

### Data flow

| Shown on a card | Comes from | Real data | Status |
|---|---|---|---|
| tag (the board's own value) | the design store's live board, through the page's formatter | yes | FLOWING |
| drawing and its dashed push | the app's own calculators run on the live board with one field changed | yes | FLOWING |
| Estimated Volume on VOLUME | `quotedVolumeLitres` from the store (the figure every page quotes), never the quick estimate | yes | FLOWING |
| sentences | the words module, with Metric sayings swapped in for a Metric shaper | yes (static by design) | FLOWING |

### Behavioural spot-checks

| Behaviour | Command | Result | Status |
|---|---|---|---|
| The GUIDE's unit tests | targeted vitest run (once) | 21 files, 305 tests passed, exit 0 | PASS |
| Types | `tsc --noEmit` | exit 0, no output | PASS |
| MODEL INFO sentences really match the deleted file | `git show main:components/fins/fin-model-info.tsx` read against `words/fins.test.ts` | all 24 match | PASS |
| No code changed since the browser run | `git diff --stat 83cafbcd..HEAD -- . ':!.planning'` | empty | PASS |
| Browser specs | not run here (forbidden while the gate runs) | `test-results/.last-run.json` reads passed, no failed tests | SKIP — see "How this was checked" |

### Probe execution

Not applicable: the phase declares no probes.

### Requirements coverage

| Requirement | Verdict | Proof |
|---|---|---|
| R1 GUIDE last on five strips, MODEL INFO gone | met | truth 1 |
| R2 84 cards under the sidebar's headings | met | truth 2 |
| R3 the board's own value on each card | met | truth 3 |
| R4 the cartoon with the setting pushed | met | truth 4 |
| R5 pushes are the app's real maths | met | truth 5 |
| R6 words equal the words page; 14 Model info notes | met | truth 6 |
| R7 informational only | met | truth 7 |
| R8 layout on computer and phone | met (browser proof read, not re-run) | truth 8 |
| R9 FINS by setup, MODEL INFO words kept | met | truth 9 |
| R10 Depth for diamond and swallow only | met | truth 10 |
| R11 the shaper's system everywhere | met (MD-02 awaits his word) | truth 11 |
| R12 nothing else moves | met on the code; the reference-picture check runs in the gate | truth 12 |
| R13 checks, pictures, go-live | pending — plan 18-10 has not run | pictures done (truth 15); the rest is the gate |

No `.planning/REQUIREMENTS.md` exists in this checkout; the phase's requirements are 18-SPEC.md's R1 to R13, and none is orphaned.

### Recorded departures — confirmed honestly written down, not raised again

| Item | Where it is recorded | Honest? |
|---|---|---|
| D-28: lazy drawing not built though four pages pass 150 ms on a slowed phone | `18-TIMING.md`, `18-CONTEXT.md` D-28 outcome, `18-08-SUMMARY.md` deviation 6 | Yes — called a departure put to the founder |
| MD-02: the maker's inch order code on the Customize Rocker card in Metric | `18-REVIEW-FIX.md` | Yes |
| LW-05: the caption is not read to a screen reader | `18-REVIEW-FIX.md` | Yes |
| Follow-ups LW-04, LW-06, IN-01, IN-03, IN-04 | `18-REVIEW-FIX.md` | Yes |
| D-21 changes the founder's 2026-10-08 name rule on ROCKER and RAILS | CLAUDE.md, `pictures/README.md` | Yes |
| The BOTTOM page's GUIDE adopting the shared card | `.planning/todos/pending/2026-11-09-bottom-guide-adopts-the-shared-guide-card.md` | Still pending, on purpose |

### Anti-patterns

None blocking. No TBD, FIXME, XXX, TODO or placeholder marker in any of the 76 files the phase touched. Every skipped test is a by-project skip (computer block skipped on phones and the reverse).

### Notes (information only, none blocks the goal)

1. **Three card names follow the board but are not written on the words page.** When a board's settings change, three cards take the sidebar's other label: VOLUME's "Board Area (estimated)" and "Weighted Thickness" (Import Designed Board unticked) and ROCKER's "Edit Custom Rocker" (a blank with a custom rocker). SPEC R2 allows names to follow the board, and tests pin each one, but the words page's header only mentions FINS' Fin Box Length, and CLAUDE.md says every word on every card lives on that page. The three are typed a second time in the builders rather than shared with the sidebar's own label, so the two could drift apart unnoticed. Pointers: `lib/geometry/guide-volume.ts:389,396`, `lib/geometry/guide-rocker.ts:1031`, `components/volume/volume-calculation-card.tsx:81,83`, `components/guide/guide-view.ts` (`name: model.name ?? card.name`).
2. **One test title is out of date.** `lib/geometry/guide-rails.test.ts:87` still says "where the words page says 30 5/16\"". The words page was corrected to 30 1/2" (line 316, commit `c0e7efb9`) and the card, the page and the test's assertion all agree; only the title and one sentence in `18-05-SUMMARY.md` ("names this one card as the known difference") are stale.
3. **On ROCKER and RAILS the browser test holds a card's on-screen name to the builder, not to the words page** (`e2e/guide-rocker.spec.ts:70`, `e2e/guide-rails.spec.ts:63`); TEMPLATE, VOLUME and FINS hold it to the words page directly. The unit tests pin the two station-labelled names, so nothing is unguarded today.
4. **One guide builder reads a slider range from outside `lib/geometry/`**: `lib/geometry/guide-rocker.ts:22` imports `FIT_DEFAULTS_RANGE_IN` from `lib/fit-defaults-preference.ts`. That module touches no browser API, React or database, and `blank-fit.ts` already imports from `lib/blanks`, so Rule 1 holds.

### Human verification required

1. **The founder's look.** Open each of the five pages on his phone (upright and sideways) and on a computer, tap GUIDE, read the cards. Expected: as the goal says; nothing cut off; nothing pressable. Why human: how a drawing reads and whether the words are right are his; every sentence is a first draft.
2. **D-21, the name on a crowded strip.** Look at the eight strip pictures. Expected: accept the name stepping aside on ROCKER and RAILS, or ask for shorter phone tab words. Why human: it changes his rule of 2026-10-08.
3. **D-28, opening time on a slow phone.** Read `18-TIMING.md`. Expected: accept the measured times or ask for lazy drawing. Why human: a recorded departure put to him.
4. **MD-02, the maker's inch code on a Metric GUIDE card.** Expected: his word, and CLAUDE.md Rule 2's list updated if he allows it.
5. **LW-05, the caption for a screen reader.** Expected: his word.
6. **Plan 18-10, the go-live gate (R13).** Expected: the whole suite, lint, build and every browser test green; main pushed; the live site confirmed. Why human/pending: not run yet by design, and this verification ran no browser test itself.

### Gaps summary

No gaps. Every requirement from R1 to R12 is met in the code as it stands, the five specific risks the orchestrator named were looked for and not found, and the departures already put to the founder are written down honestly where they should be. The status is human_needed, not passed, because the phase ends with the founder's look and the go-live gate, and because the browser-only truths (8, 13 and the live redraw in 3) rest on a browser run I read but was told not to repeat.

---

_Verified: 2026-11-10T15:19:36Z_
_Verifier: Claude (gsd-verifier)_

## Closed 2026-11-14 (the v1.5 milestone close)

Of the five checks left to a person above, the founder ruled three on 2026-11-10 after trying the live site on his phone (`18-10-SUMMARY.md`): the board's name stays off narrow ROCKER and RAILS strips, a GUIDE opens fast enough, and the maker's inch rocker code stays on a Metric shaper's card. The cards' words are his to edit at any time. The one question never answered — whether a drawing's caption should be read to a screen reader (LW-05) — is carried as a to-do dated 2026-11-14, not as an open check on this phase.
