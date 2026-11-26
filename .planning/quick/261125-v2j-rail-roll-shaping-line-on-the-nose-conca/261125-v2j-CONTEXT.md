---
quick_id: 261125-v2j
date: 2026-11-25
source: the founder, 2026-11-25 — the How to shape line for the Rail Roll
---

# The Rail Roll's shaping line on the nose-concave GUIDE cards and the printed page — decisions (locked)

## The founder's words

1. On the first draft ("Mark the concave's edge first, Off Rail in from the rail, and cut the concave to that line. Then roll the
   rail into it: nothing off at the line, the Rail Roll's amount off at the rail, and blend the two."): "I didn't like the how to
   shape. It needs to be more simple, clear, and fairly short."
2. Of three shorter drafts: "Use 1, add it to the three nose concave cards" — draft 1 is: **"Cut the concave first. Then plane
   from its edge out to the rail, taking the Rail Roll off at the rail, and blend it smooth."**
3. On the printed page (below): "yes, go ahead".
4. Models: planning on Opus (Fable is out until 2026-11-27 03:00), executor on Opus.

## What was found

Appending the line to the three cards' `how` in `components/bottom/bottom-guide-words.ts` and on the words page
`.planning/milestones/v1.5-phases/17-bottom-contours/17-GUIDE-WORDS.md` (tried, then reverted) passes the GUIDE's own tests, but the
printed bottom page (`components/summary/bottom-sheet-fit.ts`, `noteFor` → `guideHow`) prints each cut's How to shape, and
`components/summary/bottom-sheet-fit.test.ts` fails: `'fish every8' — every sheet the bottom prints on has room for what the rule
put on it` — "the page's own parts do not fit their sheet: expected -3.537 to be >= 0". The page's layout counts a note's lines from
its letters (`linesOf`, `noteLines`), so a longer note is where it ran out.

## Decisions

- **D-01 — The words, exactly:** "Cut the concave first. Then plane from its edge out to the rail, taking the Rail Roll off at the
  rail, and blend it smooth." On the GUIDE it is added to the How to shape of Teardrop Nose Concave, Blended Nose Concave and Slight
  Single Concave Entry, after the existing words, always shown. The words page and the code agree line for line (the existing test
  holds them), and the GUIDE's card pictures are untouched. If the same note also reaches a Metric shaper through `guideHow`'s unit
  handling, nothing in this line carries a unit.
- **D-02 — The printed page carries the line only when that board's nose concave has a Rail Roll above 0** (matching the printed cut
  sentence, which mentions the roll only above 0 — quick 261125-mf8). A board with no roll prints exactly today's note and today's
  layout.
- **D-03 — No note may run off a printed sheet.** Fix the printed bottom page's room accounting so a cut carrying the longer note (a
  nose concave with a roll, on the fullest boards the test covers: every8 sets, Fish and Longboard and the longest board) still fits
  — the rule moves things to the next sheet or gives the picture's room, as its existing design does, rather than clipping. The
  plan reads how the layout decides (`bottom-sheet-fit.ts`) and fixes the cause at that depth, not a one-off pad. The existing
  layout tests stay green; boards without a roll lay out exactly as today unless the fix is proven necessary for them too (then
  say so).
- **D-04 — Tests:** the words test (page = code); a printed-page test with a Rail Roll above 0 on the every8 Fish and Longboard sets
  in Imperial and Metric (fits, line present) and at 0 (line absent, layout identical to today); the e2e spec(s) for the GUIDE's
  BOTTOM cards and the printed bottom page (`e2e/bottom-guide.spec.ts`, `e2e/summary-bottom-page.spec.ts`) stay green.
- **D-05 — Nothing else changes:** no geometry, no import, no slider; saved boards identical.

## Out of scope

The "What it does" draft (not asked for); any other GUIDE card; pushing.
