# Quick 261126-akp — start the nose rail at a rolled nose concave's mark

**Source:** spike 009 (`.planning/spikes/009-rail-from-concave-mark/README.md` — read it whole; its trial code is the
`trial-code.diff` inside its `spike-source.tar.gz`, switch `S9_RULE=A`, the `s9RailStartLimiter` idea) and spike 008
(`.planning/spikes/008-longboard-nose-roll/README.md`, why the Longboard's roll disappears under its soft nose rail).

**The founder's ask (2026-11-26).** After spike 009 showed rule A does not make the Longboard's roll readable from a .brd,
he chose to draw the board this way for its own sake — his shaping order: "I generally shape the bottom contour in first
(i.e. mark how close the nose concave comes to the rail, etc). Then, I shape the rail and blend them together." He answered
the spike's three headline choices "1-3 as suggested".

## Decisions (locked)

- **D-01 Rule A.** Where one of BOTTOM's three nose concaves (Teardrop Nose Concave, Blended Nose Concave, Slight Single
  Concave Entry) has a Rail Roll above 0, RAILS' Bottom Tuck 3 is pulled out to the concave's Off Rail mark, all three
  bottom tucks scaled together so the rail keeps its own proportions; the roll is then the blend from the mark to the rail.
  "The rail starts" means Bottom Tuck 3 (the line the shaper draws), not the sanded rail.
- **D-02 Along the board** the pull fades with the roll's own share (full from the tip to Deepest At, gone by End), so the
  rail and the roll always fade together, with no step or kink. The Slight Single Concave Entry's pull reaches RAILS' centre
  card on a Longboard; it stays on the roll's own share.
- **D-03 Ease in (founder's choice 1).** The pull is eased in over the first 1/16" of roll (0 at roll 0, full at 1/16" and
  above), so a 1/64" roll does not jump a Longboard by 0.4 L (1.4 L with a Slight). Smooth in the roll, monotone.
- **D-04 Never pushed in (founder's choice 3).** When the mark is further in than the rail already starts (every stock
  Shortboard, Mid-length and Fish), nothing changes: the rule only ever pulls a rail out toward the rail's edge.
- **D-05 RAILS shows it (founder's choice 2).** While a roll stands, RAILS' Bottom Tuck 3 slider is greyed out on the
  card(s) the pull reaches, and the card shows a short note that the nose concave's mark on BOTTOM sets where the rail
  starts there. The tuck marks the card reads are the pulled ones (Rule 1: rail-band dimensions are calculated — never a
  slider that silently does nothing). Draft the note's words in the SUMMARY for the founder to approve; keep them short.
  Back to roll 0 → the slider works again with the shaper's own value untouched (the pull never writes the stored value).
- **D-06 Identity.** Every board with roll 0, every board without a nose concave, and every rolled board whose mark is
  already further in than its rail starts (the stock Shortboard, Mid-length, Fish) must be byte-identical today vs after:
  surface, litres, .brd bytes, printed figures. Spike 009's 340-board identity check (`litres.mts`) is the model.
- **D-07 Storage never changes.** The pull is computed at draw time from the board; no saved value is rewritten, no
  migration. The Rail Roll is not live (origin/main 2f7db642 carries no 261125-mf8 commit), so no production board
  redraws.

## Constraints on the import (.brd) — hard, with a stop condition

Boards opened from a file are drawn under the rule automatically. Spike 009 measured, under rule A without the ease-in:
the founder's twelve sample files identical except 92Log (rails 1.64/0.45 → 1.93/0.50 mm; bottom unchanged), and rolled
Longboards taking 2.0–7.3 s longer to open. The founder's standing rules for the import: **none of the twelve files worse**
(widest and typical bottom AND rails miss, cut names), and **no more than about 2.5 s added to open**.

- Measure the twelve files (`~/Downloads/*.brd`, read in place; skip `_decrypt` copies; test-curves-v2 duplicates
  quadtesting; never copied into the repo, committed, or named in a test) and open times before and after, with `uptime`.
- If 92Log (or any file) is still worse, or the open time is over the limit, find the smallest import-side fix (e.g. the
  fit scoring a roll under the rule, or the rails refit at the nose following the pulled tucks) and measure it. If none
  keeps every file at or better than today within the time limit, **STOP and report** with the numbers — do not ship a
  worse file; the orchestrator takes it to the founder.

## Not in this task

- GUIDE words (BOTTOM's nose-concave cards, RAILS' Bottom Tuck 3 card): the founder's words page comes first — a
  separate quick task. Only the RAILS note in D-05 is in scope, drafted for approval.
- Any change to how the import chooses a roll (spike 008: not readable on the Longboard).

## Working rules

- Geometry in `lib/geometry/`, pure and tested (CLAUDE.md Rule 1); units through `lib/geometry/units.ts` (Rule 2).
- Gates: `npm test`, lint, typecheck, and the browser specs that touch RAILS and BOTTOM, on the executor's own `PW_PORT`
  (not 3100/3141).
- Never `cd` into a subfolder; `git -C` and absolute paths. Never `rm` with unguarded variables.
- Plain shaper's English in the SUMMARY and commit messages.
