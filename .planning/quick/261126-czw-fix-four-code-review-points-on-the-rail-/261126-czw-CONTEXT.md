# Quick 261126-czw — four code-review points on the Rail Roll, before the push

**Source.** The pre-push code review of `origin/main..main` (2026-11-26), over quicks 261125-mf8 (the Rail Roll on BOTTOM's
three nose concaves), 261125-v2j (its GUIDE line, the printed bottom page) and 261125-v2f (a .brd nose concave coming back
with its roll). The founder, 2026-11-26: **"fix 1-4. leave 5, then push"**. Point 5 (a Teardrop's roll starts at Off Rail,
not at its closing edge) is left as it is.

## Decisions (locked)

- **D-01 (review point 1): the Rail Roll is greyed out while the concave's Depth is 0.** A nose concave at Depth 0 cuts
  nothing, roll included (`cutFoamOffParts`), so today the Rail Roll slider moves nothing there, and BOTTOM's floor note
  (`bottom-controls.tsx` ~296) and DATA note (`bottom-data.tsx` ~105) still treat the roll as present.
  - The Rail Roll row is disabled (greyed, the way the page already disables a control, if it has a pattern; otherwise the
    slider's own disabled state) while Depth is 0; it comes back live the moment Depth is above 0.
  - **The stored roll is kept**: dragging Depth to 0 and back brings the shaper's roll back untouched. Never delete or
    rewrite it because Depth hit 0.
  - Everything that asks "is there a roll" for a shaper-facing reason (the notes, the printed cut sentence, the GUIDE line on
    paper, the .brd fit preview's across words) answers no while Depth is 0. The cleanest route is probably the resolved
    cut's `railRoll` reading 0 when Depth is 0 while the stored key stays — the planner checks every reader of
    `ResolvedCut.railRoll` and `railRollOf` and says which route it takes.
  - Draft any new words (a hint under the greyed row, if one is needed) in the SUMMARY for the founder; keep them short. If
    the page's existing disabled look needs no words, add none.
- **D-02 (point 2): the concave tie is for a belly only, as the founder ruled** ("concave in the nose is super common and
  should win", spike 007/quick v2f, about a roll read as a belly). In `chooseBrdNoseRetry` (`lib/geometry/brd-bottom.ts`
  ~1346) `centreLift` counts a vee too; the tie must apply only when the try replaces a **belly** (today's nose a belly
  and the try's a nose concave, or today's centre a belly and the try's flat). A vee replaced is held to the fit's ordinary
  rules. Measure: v2f's 296-board grid and the twelve files before vs after (the scripts are in
  `.planning/quick/261125-v2f-open-a-board-file-brings-back-a-nose-con/` `scripts.tar.gz`); report every board whose answer
  changes. Expected: none or very few; any change must be a centre vee kept that a roll used to replace.
- **D-03 (point 3): a stored Rail Roll is held to BOTTOM's own range, 0 to 1/2".** `lib/models/design-snapshot.ts` reads
  `railRoll` with `bottomDepthSchema` (0 to 1"); give the roll its own bound at the slider's 1/2" (`BOTTOM_MARK_RANGES_IN.railRoll`,
  through `units.ts` — never a bare 25.4). Past it, the file's documented rule for a bad roll applies: no key, the cut and
  the rest of the board kept. Update the file header's sentence that names the 1" bound. Do not change Depth's own bound.
- **D-04 (point 4): two efficiency points, no change in any answer.**
  - `polishBrdBottom` (`brd-bottom.ts` ~1399) measures today's bottom again (`close(today)`) right after `shown(polished)` /
    `shown(bottom)` measured it: keep those closeness results and reuse the chosen one. Every board and file opens to the
    same digest; one measurement fewer per file.
  - The printed bottom page's top-view room (`components/summary/bottom-sheet-fit.ts` ~381) comes down one dot at a time,
    re-laying the page each step, with only `> 1` as a floor. Work the room out directly (the page height is linear in the
    room, or a bounded search) so it gives **exactly the same room** for every board the existing tests and the fit sweep
    cover (`bottom-sheet-fit.test.ts`, `e2e/summary-planing.spec.ts`, `e2e/summary-bottom-page.spec.ts`), and give it a
    sensible floor; say in the SUMMARY what happens at the floor.

## Identity (all four points)

Every saved board, preset and opened file draws, counts litres, prints and exports exactly as on main today, except:
D-01 only where a nose concave has Depth 0 and a roll (nothing is cut there now either, so the board itself is unchanged —
only words and the greyed row change); D-02 only on boards whose centre vee was being replaced by a roll; D-03 only for a
stored roll over 1/2". Prove it with the existing suites, plus a test per point.

## Working rules

- Geometry in `lib/geometry/`, pure and tested (CLAUDE.md Rule 1); units through `lib/geometry/units.ts` (Rule 2).
- Gates in the executor's worktree: `npm test`, `npx tsc --noEmit`, `npm run lint`, and the browser specs these points touch
  (`e2e/bottom-rail-roll.spec.ts`, `e2e/bottom-panel.spec.ts`, `e2e/summary-bottom-page.spec.ts`, `e2e/summary-planing.spec.ts`)
  on `PW_PORT=3158`. `npx next typegen` if route types are missing; Turbopack `npm run build` does not work in a worktree.
- The founder's sample files `~/Downloads/*.brd` are read in place only — never copied into the repo, committed or named in a test.
- Never `cd` into a subfolder; `git -C` and absolute paths. Never `rm` with unguarded variables.
- Plain shaper's English in the SUMMARY and commit messages. Nothing is pushed by the executor; the orchestrator pushes.
