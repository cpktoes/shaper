---
phase: 14-realistic-surfboard-flow
plan: 15
subsystem: rocker-screen
status: complete
tags: [rocker, thinning-starts, datasheet, drawing, accessibility]
requires:
  - "14-11: formatThinningStartBare, thinningMarksSentence (lib/geometry/blank-reasons.ts)"
  - "14-12: BlankSideView.tips.{nose,tail} (fromTip, station)"
provides:
  - "THINNING_MARK_OVERSHOOT, THINNING_MARK_DASH (components/rocker/rocker-view-frame.ts)"
  - "data-thinning-mark=\"nose\"|\"tail\" on ROCKER's drawing"
  - "data-datasheet-thinning on the DATASHEET's From tip row"
affects:
  - "14-14 (hand-set start interaction tests can now read the marks and the DATASHEET row)"
tech-stack:
  added: []
  patterns:
    - "Drawing reads stations from the profile and layout numbers from rocker-view-frame.ts; words from blank-reasons.ts"
key-files:
  created: []
  modified:
    - components/rocker/rocker-view-frame.ts
    - components/rocker/rocker-viewer.tsx
    - components/rocker/rocker-datasheet.tsx
    - e2e/rocker-blanks.spec.ts
decisions:
  - "The DATASHEET row's attribute is passed through Row as a typed optional prop rather than a generic attribute spread, so Row stays a closed component"
  - "The page-change waits in rocker-blanks.spec.ts get 30 s, because the test dev server builds a page on its first visit and that took over 5 s under the wave's load"
metrics:
  duration: "about 45 min of working time (the run was cut off once by a lost connection)"
  completed: 2026-10-02
actuals:
  tokens: 4800
  tasks: 2
  commits: 4
---

# Phase 14 Plan 15: Thinning marks on ROCKER's drawing and the DATASHEET's THINNING STARTS block Summary

With a blank picked, ROCKER's side profile now draws a faint dashed line across the board at each tip's
thinning start, and its accessible name gives both distances. The DATASHEET gains a THINNING STARTS block
whose one From tip row puts the nose start under NOSE TIP and the tail start under TAIL TIP. With no blank,
and on the printed order form's small drawing, nothing changes.

## What a shaper sees

- **On the drawing:** a short dashed line crosses the board where each tip's thinning starts. On Automatic
  that is the 12" station for both tips on the default board's blanks, so the mark lines up with the
  Nose @ 12" and Tail @ 12" leaders. It reaches 6 units past the bottom and the deck so it still shows on a
  thin tail. It is drawn in the blank's own line colour with the 1-unit `4 3` dash and has no text. It turns
  with the board nose-left and nose-up.
- **For a screen reader:** the drawing's name now ends `…and a dashed line across the board where each tip's
  thinning starts: 12" from the nose tip and 12" from the tail tip` (`30.5 cm` in Metric).
- **On the DATASHEET:** after FOAM OFF comes `THINNING STARTS`, with one read-only row, `From tip`
  (`From tip (cm)` in Metric). It shows `12"` under NOSE TIP and `12"` under TAIL TIP (bare `30.5` in Metric),
  with the three middle columns empty. FOAM OFF's Bottom row now has its rule line, and the new row is the
  table's last, with no rule under it.

## Tasks

| Task | Name | Commit | Files |
|------|------|--------|-------|
| 1 | The dashed mark at each tip's start, and the drawing's name (tracer) | af0b9f2 | rocker-view-frame.ts, rocker-viewer.tsx, e2e/rocker-blanks.spec.ts |
| 2 (RED) | Browser tests for the DATASHEET block | b2fa657 | e2e/rocker-blanks.spec.ts |
| 2 (GREEN) | The DATASHEET's THINNING STARTS block | 77b71c5 | rocker-datasheet.tsx |

## Verification

- `npx tsc --noEmit` and `npm run lint` pass with no errors.
- `e2e/rocker-blanks.spec.ts`: **42 of 42** pass after Task 2 (14 desktop, 28 across iPhone and Android). That
  includes the new tests `the thinning marks cross the board at both tips with a blank, and nowhere without
  one`, `with a blank picked the DATASHEET's THINNING STARTS row puts each start under its tip, the same
  distances the drawing names`, `in Metric the THINNING STARTS row reads From tip (cm) and the two starts in
  bare centimetres` and `with no blank the DATASHEET has no THINNING STARTS block`. The tracer gate after
  Task 1 ran 33 of 33.
- `e2e/desktop-baseline.spec.ts --project=desktop`: **5 of 5** pass. No snapshot was changed, and
  `git diff --name-only 26db272 -- e2e/*-snapshots` is empty.
- RED was confirmed before GREEN: the two blank-picked DATASHEET tests failed because the row did not exist
  yet. The no-blank guard passed, as it should.
- Acceptance greps all pass. Both constants are in the frame file (count 2). `data-thinning-mark` is in the
  viewer. `outline-blank-line` in the viewer went from 3 to 4. `THINNING STARTS` appears 3 times in the
  datasheet and `formatThinningStartBare(` exactly 2 times.
- `lib/geometry/phase11-foil.test.ts` and `lib/models/design-snapshot.test.ts` are unchanged, because only the
  plan's four files changed.

## The mark in all four themes (UI E04 Populated, checked by eye)

The screenshots are in the scratchpad only, at
`/private/tmp/claude-501/-Users-kontoes-Code-shaper/cc262c20-8a7f-4131-85dd-bdda1e6ce66a/scratchpad/exec14/shots14-15/`.
All show the US Blanks 6'2"A blank, the first fitting blank for the default board, on Automatic with both
starts at 12".

| Theme | Whole drawing (iPhone, nose-up) | Close-up at the Tail @ 12" leaders | Verdict |
|-------|------|------|---------|
| Daylight | `iphone-daylight-drawing.png` | `iphone-daylight-tail-mark-zoom.png` | Reads as its own line: the stretch across the board is dashed and a shade darker than the solid grey leaders. Still faint. |
| Chalk | `iphone-chalk-drawing.png` | `iphone-chalk-tail-mark-zoom.png` | Same as Daylight: dashed and darker than the leaders, and faint. |
| Slate | `iphone-slate-drawing.png` | `iphone-slate-tail-mark-zoom.png` | Reads as its own line: the dashes are lighter than the dim leaders on the dark board. Faint. |
| Phosphor | `iphone-phosphor-drawing.png` | `iphone-phosphor-tail-mark-zoom.png` | Reads as its own line: the dashed green stretch is visibly brighter than the dim solid leaders. Faint. |

The same three pictures exist for the desktop (`desktop-<theme>-drawing.png`, `desktop-<theme>-tail-mark-zoom.png`),
plus a DATASHEET picture per theme for each device (`<device>-<theme>-datasheet.png`).

**One honest caveat for the founder's look:** on the desktop at normal pixel density, a 6'2" board drawn
nose-left is only a few pixels thick at the 12" stations. There the mark is one or two short dashes, lined up
with the leaders, and hard to pick out without zooming. The iPhone pictures, which draw the board larger and
at three times the pixel density, show it clearly. This matches what UI-SPEC §6 predicted ("where they meet
it reads as one line through the board at the 12" station"). If the founder wants the mark more visible on a
computer, the knob is `THINNING_MARK_OVERSHOOT` or the dash in `rocker-view-frame.ts`. Nothing else would
need to change.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] Longer waits for the first visit to another page in `rocker-blanks.spec.ts`**
- **Found during:** Task 1.
- **Issue:** On iPhone, under the wave's load, tapping the bottom bar's SUMMARY link (in the new test) and
  RAILS link (in the existing `Center Thickness is the board's one centre` test) left the address unchanged
  after 5 s. The test dev server was still building the page on its first visit. Both pass when run alone.
- **Fix:** `toHaveURL(..., { timeout: 30_000 })` on those two waits, with a comment. No other change to an
  existing test.
- **Files modified:** e2e/rocker-blanks.spec.ts (in the plan's files).
- **Commit:** af0b9f2.

**2. [Plan wording] The existing DATASHEET test's name check no longer stops at the old ending**
- The existing test matched the drawing's name with `…bottom shaded$`. UI-SPEC's new name goes on after
  that, so the pattern now matches `…bottom shaded, and `. Same file, commit af0b9f2.

**3. [Rule 2 - Correctness of a comment] The viewer's header comment**
- It said "Nothing else is added to the drawing for a blank", which this plan makes untrue. It now describes
  the thinning mark. The DATASHEET header's "four blocks, ten rows" miscount is corrected to "four blocks,
  nine rows", as the plan asked.

No file outside `files_modified` was touched. No package was added.

## Known Stubs

None.

## Threat Flags

None. The mark reads the profile's resolved start, which 14-08/14-09 already pull into range and turn to
Automatic when it is not a number (T-14-29). No new network, auth or storage surface.

## Self-Check: PASSED

- FOUND: components/rocker/rocker-view-frame.ts, components/rocker/rocker-viewer.tsx,
  components/rocker/rocker-datasheet.tsx, e2e/rocker-blanks.spec.ts
- FOUND commits: af0b9f2, b2fa657, 77b71c5
