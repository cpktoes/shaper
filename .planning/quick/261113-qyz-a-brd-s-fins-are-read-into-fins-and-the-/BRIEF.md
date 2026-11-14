# Brief — quick 261113-qyz: fins both ways in a .brd

Seventh step of opening a `.brd`, and the first change to the `.brd` export since it went live. Read first, in
`.planning/quick/`: `261113-kvo-*` (rails — the newest state of the preview, the printed overview, the worker and
Open as a Board), `261113-hyy-*` (wings — how a "the file / ours" line is written) and `261110-tvk-*` onward for
the export (`lib/export/brd.ts`, `brd-preview.ts`, `components/3d/brd-preview-dialog.tsx`). Anchor on function
names, not line numbers; the executor re-reads every file as it then stands.

## The founder (2026-11-13 — locked, word for word)

> "Are we able to read in fin data too?"

I answered that his four files carry none (their fin slot is all zeros). He sent a fifth file:

> "Try this, i think it has fin info. Also, we should export our fin info into the .brd export if the format
> handles it."

So two things: **F-IN** — a `.brd` that carries fins opens with them on FINS; **F-OUT** — the app's `.brd`
export carries the board's fins.

## The format's fin facts (verified by me in AkuShaper 3.1.3 on this Mac, 2026-11-13)

One header line: `p50 : [a,b,c,d,e,f,g,h,i]` — nine numbers, **centimetres**, x measured **from the tail end
(x = 0)**, y **off the stringer**:

| slot | meaning | how I know |
|---|---|---|
| 0, 1 | side fin's BACK end: from the tail, off the stringer | drawn there |
| 2, 3 | side fin's FRONT end: from the tail, off the stringer | drawn there (front nearer the stringer = toe-in; AkuShaper draws a dotted toe line on from it) |
| 4, 5 | centre fin: its back and its front, from the tail (on the stringer) | drawn there |
| 6, 7 | unknown — filling them changed nothing on Board Info | tested |
| 8 | `5.4` in his file — believed the side fins' cant in degrees; **not verified** | his file only |

AkuShaper's Board Info "Fin setup" is **derived from these numbers**, not stored elsewhere — five test files:
all zeros → `NONE`; centre only → `SINGLE`; side only → `TWIN`; side + centre → `TRI`. There is **no room for a
quad's rear pair** (slots 6–7 are not it). `p51` is a text field that holds `Futures` in his file (believed the
fin system / box; it is not shown on Board Info); in the Scoop it is present and empty. The app's own writer
writes `p50` as nine zeros today and no `p51` (`lib/export/brd.ts`; its strict reader `readBrdText` and tests
rely on that line).

His file (`~/Downloads/JFS_BigTwin.brd` — **never commit it or its text; its header carries people's names**):
a 6'4 1/2" × 20 1/2" twin pin. Side fin: back 9.5" off the tail and 5.2" off the stringer (1.61" in from the
rail there), front 14.1" off the tail and 5.0" off the stringer; base 4.6"; toe-in 0.2" over the base (2.49°);
no centre fin; slot 8 = 5.4; `p51 : Futures`. AkuShaper shows it as `TWIN`.

Scratch (outside the repo): `/private/tmp/claude-501/-Users-kontoes-Code-shaper/4bd02881-795f-4931-8d36-b0c262541886/scratchpad/fins/`
— `hdr.ts` / `one.ts` (print a file's numeric header fields with the name fields hidden), `where.ts` (the fin
against the file's own outline), `variants.ts` (rewrites his file's `p50` and scrambles it again — how the five
AkuShaper test files in `fins/out/` were made).

## What it means here

The app does not store fin positions: FINS **calculates** them (`lib/geometry/fins.ts` — `FinPlacementSpec`:
`finSetup` single / twin / thruster / 2plus1 / quad, the models `frontModel` / `quadRearModel` /
`twinTemplate`, and `FinAdvancedSpec`'s offsets, toe overrides, off-rail nudges and base lengths;
`computeFinPlacement`, `designFinPlacement` in `design.ts`; `finSystem` on the saved board). **Find out first
what a shaper can move on FINS and each control's range and step — never restate a range, read it from the
code.**

- **F-IN-1 — Read.** `readAnyBrd` (forgiving, bounded — the file is untrusted text) also returns the fins:
  which of side / centre are there, their ends in mm, and the `p51` text. Nine finite numbers or nothing; a fin
  whose ends fall outside the board, or whose front is behind its back, is ignored (say the rule).
- **F-IN-2 — Fit.** The setup from what the file holds (side only → twin; side + centre → thruster — or 2+1,
  your call with a measured reason, e.g. the centre fin's base length; centre only → single; nothing → the
  board keeps a new board's fins and the preview says the file has none). Then the controls FINS really has,
  set so **our calculated fins land on the file's**: pure and tested in `lib/geometry/` (Rule 1), every value
  inside its control's range and on a step the control can show where it snaps (elsewhere actual values — the
  founder's rule: round only for display). Measure on his file how close each of the file's four figures comes
  (the fin's distance off the tail, its distance in from the rail, its toe-in, its base length — the app's own
  four fin marks) with every twin template and say which is chosen and why. If a control's range stops short
  (e.g. the off-rail tuner's window), say by how much — that is a finding.
  - Mind what the app measures from: the fit is on OUR fitted outline (the wing and tail the earlier steps
    fitted), and "off the tail" on a board whose tail the `.brd` writes square. Say what x = 0 is on each tail
    kind and prove the round trip on each.
  - `p51` → the board's fin system when the text clearly names one of the app's six (`FIN_SYSTEMS`); otherwise
    the app's default, and the preview quotes the file's own word.
  - Cant: the app has none on FINS. Do not invent a control; the preview may quote slot 8 as "the file's ninth
    fin figure (5.4) isn't used" only if you can say honestly what it is — otherwise leave it out of the words
    and list it under "not read" plainly.
- **F-IN-3 — Say it and open it.** A FINS block on the preview and the printed overview in the family of the
  WINGS line and the RAILS block: the file's fin figures beside ours (off the tail, in from the rail, toe-in,
  base length — as marks: whole mm in Metric, Rule 2), the setup and the system, how close; the fins drawn on
  the top view (the file solid, ours dashed — a short line each, as AkuShaper draws them) if it stays legible —
  your call, with a picture. Open as a Board opens with them on FINS. The "not read" line: fins leave it when
  the file has them; when the file has none it says so in one line. Whatever is still never read is said
  plainly (a quad's rear fins, cant).
- **F-OUT — Write.** `brdText` writes `p50` from the board's own calculated fins, in the format's terms above
  (cm, from the tail end as the file draws it, off the stringer): single → centre only; twin → side only;
  thruster → side + centre; **2+1 and quad are your call, flagged** (the format holds one side pair and one
  centre fin: a 2+1 fits as side + centre; a quad's rear pair cannot be written — writing only the front pair
  would read as a TWIN in AkuShaper, so decide between that with a plain line on the Board file preview, or
  writing no fins for a quad — say which and why). `p51` from the board's fin system in a word AkuShaper users
  would recognise (his file says `Futures`). Slot 8 stays 0 unless you can verify what it is. The Board file
  preview (`brd-preview.ts` / the 3D page's dialog) says in one line what fins the file carries. The strict
  reader and every existing export test follow on purpose; a board's exported curves must not move by a digit
  (pin before changing).
- **The round trip is the test with a known answer:** every preset and each setup (single, twin on each
  template, thruster on each front model, 2+1), with Advanced values moved, written by `brdText`, read back,
  fitted — the same setup and the fin marks back within a step.
- **I check AkuShaper myself after the build** (the executor cannot drive it): have the build leave six export
  files from the app's own writer in the scratch folder (`scratchpad/fins/export/`: one per setup incl. quad,
  named plainly) so I can open each and compare what AkuShaper draws and names. Shape3D is the founder's to try.

## My calls (flag what you change)

- One task, both directions — the round trip needs both. If the plan grows past four tasks, split F-OUT's
  preview words into a follow-up and say so at the top.
- Speed: the look already runs in a background worker (kvo); the fin fit must add little — say the ms.
- No database change (check a saved board already holds every fin control you set — if not, stop and say so).
- Every existing figure of the six sample files (outline, rocker, thickness, bottom, wings, rails, blanks) must
  not move. Pin before changing anything. **The tree will have moved under you:** quick 261113-psx (the Tail
  Rail default) is being built right now in this same checkout — plan against the code's shape, not its
  current figures, and tell the executor to pin the six files' figures at its own start.
- Browser tests in `e2e/brd-fit-preview.spec.ts` continue after b31 (b22–b27 rails, b28–b31 corner radius):
  use **b32 onward**.

## House rules that bite here

- Work in THIS checkout: `/Users/kontoes/Code/shaper/.claude/worktrees/close-bottom-17`, branch
  `close-bottom-17`. Never `cd` into a subfolder; never touch `/Users/kontoes/Code/shaper` itself. Nothing is
  pushed.
- **A dev server is running from this checkout on port 3117**; the founder is using it. Playwright with
  `PW_PORT=3117` reuses it. Never stop it, never start another `next dev` or a build, never run the whole
  browser suite.
- **While planning, another agent is editing source files in this checkout (quick 261113-psx).** The planner
  edits nothing in the repo but its own PLAN file and commits nothing; scratch scripts go in
  `scratchpad/qyz/`. A scratch run that fails on a half-edited file is retried later, not worked around.
- The five sample files in `~/Downloads` (the four AkuShaper boards and `JFS_BigTwin.brd`) are never committed
  nor their text copied into the repo or the plan — figures only. Pictures and PDFs made from them go in this
  task's `pictures/`.
- Never copy BoardCAD's code (its licence is not stated) — write from the format's facts above.
- Rule 1, Rule 2 (every fin placement number is a mark: whole millimetres in Metric), plain English everywhere
  a shaper reads. The board-file test files open with `vi.setConfig({ testTimeout: 60_000 })`; never assert
  milliseconds.
- `e2e/board-file.spec.ts` test f1 fails on untouched code — known, not ours.
