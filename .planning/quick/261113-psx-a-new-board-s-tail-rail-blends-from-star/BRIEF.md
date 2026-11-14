# Brief — quick 261113-psx: Tail Rail Blends From 12" and Ends At the board's centre, as the default

Anchor on function and constant names, not line numbers; re-read every file as it stands.

## The founder (2026-11-13 — locked, word for word)

After seeing a `.brd`'s rails fitted (quick 261113-kvo), and my line "Tail Rail Blends From and Ends At are not
fitted; they stay where a new board puts them":

> "Let's change Tail Rail Blends From  12" and Ends At the max value as the new default."

So, on RAILS → TAIL RAIL → Advanced: **Tail Rail Blends From defaults to 12"** (the slider's own minimum,
`HARD_EDGE_BLENDS_FROM_RANGE_IN.min` — the tail's rail station), and **Tail Rail Ends At defaults to the top
of its slider** (the board's centre — `hardEdgeEndsAtWindow`'s max, whatever the board's length). That replaces
his Phase 16 rule (D-30: start 18", end L/6 + 18" from the tail). In plain terms: by default the tail's rail
now blends evenly from the 12" station all the way to the centre, the way the nose's does.

## Where it lives (found, 2026-11-13)

`lib/geometry/rail-bands.ts`: `DEFAULT_HARD_EDGE_BLENDS_FROM_IN` (18), `DEFAULT_HARD_EDGE_ENDS_AT_RULE_IN`,
`defaultHardEdgeEndsAt(length)`, `hardEdgeBlendsFrom`, `hardEdgeEndsAt` (both read a board forgivingly: a
stored value inside its window is kept, **anything absent or outside reads the default**),
`hardEdgeBlendsFromWindow` / `hardEdgeEndsAtWindow`, `RailBandSpec.tailHardEdgeBlendsFrom` /
`tailHardEdgeEndsAt` (absent on every preset and on every board that never moved the sliders). Readers:
`volume.ts` (the litres), `board-surface.ts` (3D and the CNC / .brd exports), `guide-rails.ts`,
`blank-reasons.ts` (the sliders' views), `components/rails/rail-controls.tsx`, `components/design/design-store.tsx`
(the setters, and the reset that deletes both fields "back to 18" and 30""), `lib/models/design-snapshot.ts`,
`lib/models/rail-character-report.ts` and `hard-edge-report.ts` (the reports that say how a rule change moves
boards), `components/guide/words/rails.ts`, and tests: `rail-bands.test.ts`, `volume.test.ts`,
`design-snapshot.test.ts`, `board-surface.test.ts`, `brd-rails.test.ts`, `e2e/rails-advanced.spec.ts`,
`e2e/three-d-hard-edge.spec.ts`, `e2e/three-d-screen.spec.ts`.

## My call, flagged to the founder (he can overrule before anything is pushed)

**The default changes the way every default in this app has: a board that says nothing reads it.** So a board
already saved that never moved these two sliders follows the new default too — same as when Phase 16 brought
the 18" / 30" default in. I measured what that does to litres (hand-set foil, no blank, presets' own rails):
Shortboard 0.000 L, Fish 0.000 L, Mid-length −0.009 L, Longboard −0.044 L; with the tail's Hard Edge flipped
the other way: −0.002, −0.003, −0.006, +0.286 L (Longboard with a hard edge). A board whose sliders were moved
keeps its own stored values exactly.

The alternative (only brand-new boards get it; older saved boards keep 18" / L/6+18") needs a marker on the
saved board and a second code path forever, and "the max" cannot be stored as a number (it must follow the
length). Not built unless he asks.

## What I expect

1. **Measure first** (scratch, `scratchpad/psx/`; my first measure is `scratchpad/blend/litres.ts`): the four
   presets' quoted litres as the home page cards and SUMMARY show them (with their real blanks) before and
   after — say any card figure that changes in its shown digit; the rail between the tail station and the centre
   before/after at a few stations (how far the finished rail moves, in mm) on the four presets and on a
   hard-edged tail; and the `.brd` rails fit (quick 261113-kvo): re-run its between-stations gaps on the four
   AkuShaper files and the two app exports — with the tail blending straight from 12" to the centre the fit's
   own assumption ("between the three, RAILS blends one rail into the next") should now hold better; say each
   file's worst / typical before and after, and whether any fitted setting or the bottom-first / rails-first
   outcome changes. `scratchpad/kvo/` has the planner's and executor's scripts (`final.ts`,
   `before-after.ts`, `check.ts`).
2. **The change, pure and tested (Rule 1).** The default Blends From = the range's minimum (12"), never a new
   literal; the default Ends At = the top of its own window for that board and that Blends From (the centre),
   so it follows the length and can never be outside its window. Keep the forgiving reads (a crafted or stale
   pair always reads as a valid pair; the two never cross). Decide what `defaultHardEdgeEndsAt` and
   `DEFAULT_HARD_EDGE_ENDS_AT_RULE_IN` become (retire them if nothing needs the old rule — but the reports and
   pins that name old rules by name must keep reproducing the old figures: check `rail-character-report.ts`,
   `hard-edge-report.ts`, `surface-report`, the 40 / 74 / 102-board pins and what they read; an old rule a pin
   needs stays available under an "old" name).
   - On a board whose centre is not on a 1/2" step, say what the Ends At slider shows at its top
     (`hardEdgeEndsAtSlider` rounds inward) and make the default land exactly where the slider's top does, so
     the slider sits at its end and the label agrees.
   - A stored Ends At that falls outside its window after the board is shortened reads the default — now the
     centre. Say what that looks like.
3. **Everything that states the old default follows:** comments and doc lines ("18"", "30"", "L/3 − 18"),
   the reset in `design-store.tsx` (still deletes both fields; its words change), the RAILS GUIDE cards and
   `components/guide/words/rails.ts` if they quote a default or draw one, INSTRUCTIONS text if any, the
   Advanced menu's helper text if any, `CLAUDE.md` if it mentions it (it does not today — check), and the
   preview's line in `lib/export/brd-fit-preview.ts` ("Tail Rail Blends From and Ends At are left where a new
   board puts them." — still true; keep or reword).
4. **Tests.** Every test that pins the old default is re-pointed on purpose with the new figure worked out by
   the code's own functions, never hand-typed where a fixture rule applies (Rule 1: expected values from
   fixtures/generators — check whether any golden fixture under `lib/geometry/__fixtures__/` holds litres or
   sections that move, and regenerate by its own script, saying which numbers moved and by how much). The
   board-file snapshot pins from gwr/hyy/kvo (wingless boards, the six files' figures): say which move and why
   (the opened board's rails between stations) — the fitted settings themselves should not move unless (1)
   says so.
5. **Pictures the suite compares.** The desktop baseline screenshots under `e2e/*-snapshots/` that show RAILS,
   VOLUME, 3D, SUMMARY or a litres figure may change: for each that does, read the diff picture, then
   re-record and commit (memory: a changed baseline = diff.png → update-snapshots → re-run → commit). Never
   re-record blind.
6. **For the founder's look** (`pictures/` in this task's folder): RAILS → TAIL RAIL → Advanced open on a new
   Shortboard and a new Longboard showing both sliders at their new defaults (computer, and an upright phone);
   the 3D board's tail-to-centre rail before / after on the Longboard (side by side or two pictures); and a
   one-line table of the litres before / after.

## House rules that bite here

- Work in THIS checkout: `/Users/kontoes/Code/shaper/.claude/worktrees/close-bottom-17`, branch
  `close-bottom-17` (HEAD c0a9a872; origin/main is 15beb4c3). Never `cd` into a subfolder — absolute paths
  and `git -C`; never touch `/Users/kontoes/Code/shaper` itself. Nothing is pushed. No database change (the
  two fields are optional in the saved board already).
- **A dev server is running from this checkout on port 3117**; the founder is using it. Playwright with
  `PW_PORT=3117` reuses it. Never stop it, never start another `next dev` or a build, never run the whole
  browser suite — run the specs for touched screens (rails, volume, 3D hard edge, summary, the board-file
  preview) one file at a time.
- Slow fitting tests: the board-file test files open with `vi.setConfig({ testTimeout: 60_000 })`; never
  assert milliseconds.
- The four AkuShaper sample files in `~/Downloads` are never committed nor their text copied into the repo.
- Rule 2 (units through `units.ts` / `measure-display.ts`; these two are dims — a distance along the board —
  check how the sliders show them in Metric), plain English in every commit message and the SUMMARY.
- `e2e/board-file.spec.ts` test f1 fails on untouched code — known, not ours. `npm run lint` has one old
  warning.
- Commits: one per task, plain-English messages. Never commit PLAN / BRIEF / SUMMARY / STATE — the
  orchestrator does.
