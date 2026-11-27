# Quick 261127-kkw — a centre-to-nose rail blend control, like the tail's

**The founder's ask (2026-11-27).** "I think we need to add a center to nose rail blend control like we did for the tail."
Offered five points, he answered **"1-5 as suggested, it's for shaping by hand"**. This reverses his Phase 16 ruling of
2026-11-04 (D-32: "The rule for center/nose blending should be to make the transition as smooth as possible. We don't need
slider controls." / "Only the tail rail gets the users blend. The nose is a default that always gets applied.") — say so
wherever a comment still quotes that ruling as the reason the nose has no control.

## What exists (read these first)

- The tail's control, the model for everything here: `lib/geometry/rail-bands.ts` (the stored keys `tailHardEdgeBlendsFrom` /
  `tailHardEdgeEndsAt`, the readers `hardEdgeBlendsFrom` / `hardEdgeEndsAt`, the ranges and windows around lines 255–500),
  `lib/geometry/volume.ts` (`tailHardEdgeWeight`, `noseRailWeight`, `railCharacterFadeAt`, `SMOOTH_SURFACE_FADE`),
  `lib/geometry/blank-reasons.ts` (the two slider helpers and their formatters), `components/rails/rail-controls.tsx` (the two
  rows on the tail card), `components/3d/three-d-controls.tsx` (`ThreeDTailRail`) and `three-d-copy.ts`,
  `components/design/design-store.tsx` (the two setters, and the reset that deletes the keys), `lib/models/design-snapshot.ts`
  (rule text near line 144 and the schema near line 490), `lib/geometry/guide-rails.ts` and `components/guide/words/rails.ts`
  (the tail's GUIDE card) with the founder's words page `.planning/milestones/v1.5-phases/18-a-guide-on-every-page/18-GUIDE-WORDS.md`
  (a test holds the code to it line for line).
- Today's nose rule, fixed: `noseRailWeight(station, anchors.center, anchors.nose)` — the nose's rail as set is full from
  the tip back to the nose 12" station, then the smoothstep to nothing at the centre station. The tail's weight is the same
  smoothstep between its two marks. So the nose's fixed rule is already "Blends From 12", Ends At the centre".

## Decisions (locked — the founder's five points)

- **D-01 Two sliders: Nose Rail Blends From and Nose Rail Ends At, measured from the nose.** The nose's rail as set is full
  from the tip back to Blends From; it fades (the same smoothstep, level at both ends) and is fully the centre's rail by
  Ends At. Defaults: 12" and the board's centre.
- **D-02 Identity at the defaults — exact, not close.** A board that stores neither key draws, counts litres, prints and
  exports **byte for byte** as on main today: absent reads today's rule exactly (full at and ahead of `anchors.nose`, gone at
  and behind `anchors.center`), whatever the slider's 1/2" grid would round the centre to. The slider then *shows* the
  default the way the tail's Ends At shows its own (its top); a drag stores grid values. Prove it: the presets, the pinned
  boards (the 102-board and live-litres pins must pass un-re-recorded), the .brd bytes of the presets, and a sweep of
  hand-set boards with a nose rail that differs from the centre's.
- **D-03 Same ranges as the tail.** Blends From 12" to 30" from the nose in 1/2" steps (10 mm in Metric, as the tail's);
  Ends At at least 2" past Blends From, up to the board's centre; each slider's window follows the other's value exactly as
  the tail's windows do (`hardEdgeBlendsFromWindow` / `hardEdgeEndsAtWindow`). Short boards (4'0" and up) follow the tail's
  own rule for a centre nearer than 30". Read and format exactly as the tail's two figures do (same family, same steps).
- **D-04 Same places as the tail.** RAILS' nose card, where the tail card carries its two rows (the Advanced part), and the
  3D page beside the tail's two rows — one value, not two kept in step, exactly as `ThreeDTailRail` does it. A locked board
  greys them as it greys the tail's. If the tail's rows carry a note ("These controls are invisible here…"), the nose's rows
  carry the same note.
- **D-05 A GUIDE card on RAILS' GUIDE like the tail's**, the board drawn with the setting pushed through the app's own
  maths as the tail's card is, and first-draft words added to the words page for the founder to mark up:
  - name: `Nose Rail Blends From · Nose Rail Ends At`
  - is: "Where the nose's rail fades into the centre's: it runs as set from the nose to Blends From, fades, and is the
    centre's rail by Ends At."
  - does: "A longer nose rail carries the nose's shape further back down the board; a shorter one hands over to the centre's
    rail sooner."
  - how: "Pencil Blends From and Ends At on the rail from the nose; shape the nose's rail ahead of the first mark and blend
    it progressively into the centre's rail by the second."
  The tail's card and the 3D page's comment that say the nose has no control are corrected.
- **D-06 Storage.** Two optional keys beside the tail's on the rails spec, in millimetres **from the nose tip** (so a
  length change keeps their meaning the way the tail's keep theirs from the tail tip); absent = default; forgiving on read
  exactly as the tail's two (a bad value reads the default and never costs the board anything else); the snapshot version
  stays as it is, for the tail keys' own reason; **no database change**. RAILS' reset that puts the tail's two back also
  puts the nose's two back. Undo: one drag is one step, as the tail's.
- **D-07 Opening a .brd file is NOT changed.** `lib/geometry/brd-rails.ts` keeps fitting only the tail's blend; an opened
  file's board carries no nose keys and so reads the default. The founder's twelve sample files must open exactly as today
  (they are read in place from `~/Downloads/*.brd` only — never copied into the repo, committed or named in a test). Fitting
  the nose's blend on import is a later, measured task.
- **D-08 Where the nose's rail is the centre's** (`railCharacterDifferences(rails, "nose")` empty) the sliders move
  nothing, as the tail's do on a tail that matches the centre; do whatever the tail's rows do there, no new words.

## Not in this task

- The import's fit of the nose blend (D-07). Any change to the tail's control. Any change to the fade's shape.
- `CLAUDE.md` — the orchestrator updates it if a rule there changes.

## Working rules

- Geometry in `lib/geometry/`, pure and tested (CLAUDE.md Rule 1); every conversion through `lib/geometry/units.ts` (Rule 2).
- The old rules kept by name (`RAIL_CHARACTER_FADE`, the D-30 readers) must read exactly as before: pins taken on them are
  never re-recorded.
- Gates in the executor's worktree: `npm test`, `npx tsc --noEmit`, `npm run lint`, and the browser specs that touch RAILS,
  the 3D page and the GUIDE, on `PW_PORT=3161`. `npx next typegen` if route types are missing; Turbopack `npm run build`
  does not work in a worktree.
- Never `cd` into a subfolder; `git -C` and absolute paths. Never `rm` with unguarded variables.
- Plain shaper's English in the SUMMARY and commit messages. Nothing is pushed by the executor.
- Add a browser test for the two rows on RAILS and on the 3D page (one value on both), on a computer and a phone profile.
