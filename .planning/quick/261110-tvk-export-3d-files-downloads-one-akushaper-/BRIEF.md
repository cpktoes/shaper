# Brief — quick 261110-tvk: Export 3D Files downloads one AkuShaper .brd

## The founder's ask (2026-11-10, his words)

"when done /gsd-quick build the .brd file for the 3D export button. Keep the other work we did, but let's only
export the .brd file for now."

So: the 3D page's export button downloads **one `.brd` file** of the finished board. The DXF / XYZ / STL writers,
the zip writer and their tests **stay in the code, untouched and still tested**; the button just stops offering
them. Nothing else on the 3D page changes.

## What was proven before this task (2026-11-10)

The founder sent five AkuShaper V4.4 `.brd` files. All were opened (unscrambled) and understood. Three test
files built from his egg were opened by him in **both AkuShaper and Shape3D**, and all three opened:
plain text; scrambled with the board ¼" wider and the old stamp kept (it read 21¼"); scrambled with the stamp
removed. So: the `p58` stamp is not checked and can be left out; the curves in the file are what the programs draw.
Opening a scrambled file makes the program leave a `<name>_decrypt.brd` plain copy beside it — harmless.

## The format (facts only — write our own writer from these; never copy BoardCAD's code, its licence is unstated)

**Envelope.** The 12 ASCII bytes `%BRD-1.02s00`, then the board text encrypted with Java's
`PBEWithMD5AndDES`: password `deltaXTaildeltaXMiddle` (ASCII), salt `c7 73 21 8c 7e c8 ee 99`, 20 rounds.
That means: `d = MD5(password ‖ salt)`, then `d = MD5(d)` 19 more times; key = `d[0..8]`, IV = `d[8..16]`;
DES-CBC with PKCS#5 padding (pad 1–8 bytes, each = the pad length). The derived key is `8c41236a7fc96bce` and the
IV `7aff2c48277a18dd` — pin both in a test. Re-scrambling the unscrambled egg reproduced the original file byte for
byte with `openssl enc -des-cbc -K <key> -iv <iv>`, so this is exactly AkuShaper's scramble.
The browser has no DES (Web Crypto lacks it) and the download must happen inside the tap (Safari), so MD5 and DES
are small pure synchronous TypeScript, tested against published vectors (RFC 1321's MD5 suite; the classic DES
vector key `133457799BBCDFF1`, plaintext `0123456789ABCDEF` → `85E813540F0AB405`; plus a CBC + padding case
checked by decrypting our own output). A board file is ~5–10 KB, so speed is no concern.

**Text.** Lines end `\n`, ASCII. Header lines are `pNN : value`. All lengths in **centimetres**. Axes: **x along
the board with the TAIL at x = 0** and the nose at x = length; outline y = half-width; profile y = height.
- `p01` length (cm) · `p02` length over the bottom curve (cm) · `p03` thickness (cm, max) · `p04` width (cm, max)
- `p07 : V4.4`, `p38 : 5` (version fields — write as found)
- `p32` outline (half, tail → nose), `p33` bottom rocker (tail → nose; y = height of the bottom, so tail and nose
  lift are the end values), `p34` deck (tail → nose, y = height of the deck on the same datum as `p33`)
- `p35` cross-sections: `(p36 <station x cm> -1.0 -1.0` then knots, then `)`. A section's y = 0 is the bottom
  at the stringer at that station; it runs from the bottom at the stringer (0,0), out round the rail, back to the
  deck at the stringer (0, thickness there). A cut that drops the rail below the stringer simply gives negative y.
  The founder's files start and end with zero-size sections at x = 0 and x = length (a single knot `[0,0,0,0,0,0]`).
- Every curve is `pNN : (` … `)` holding knots `(cp [x,y, tanA-x,tanA-y, tanB-x,tanB-y] <continuous> false)` —
  cubic Bézier knots with their two handles as absolute points; `continuous` true for a smooth knot.
- Section ends: the stringer knots carry a horizontal handle (e.g. `[0.0,0.0,-8.59,0.0,0.0,0.0]`, the mirrored
  handle reaching to negative x) so the section is smooth across the stringer.
- Optional `gps : ( (gp [x,y]) … )` guide points under a section — not needed.
- The remaining machine fields (`p11`–`p26`, `p41`–`p44`, `p46`, `p47`, `p50`, `p53`, `p55`–`p57`, `p59`–`p70`,
  `p80`–`p88`, `p99`, `noseAngelWings`, `tailAngelWings`) are cutter settings whose meanings are not known.
  `p27`–`p31` are unknown vectors. **Rule: write only fields whose combination is proven to open** — the egg's own
  values for every machine field (that exact header opened in both programs as TEST3, with `p58` removed). Leave
  out `p58`, `p10` (a blank's file path on someone's PC), and the name fields `p08`, `p45`, `p48`, `p49`, `p51`,
  `p54` (meanings unsure; the file's own name carries the board's name). Each of these is missing from at least
  one of the founder's real AkuShaper files (the double concave has no `p10`/`p45`, the Fryer no `p08`/`p10`), so
  leaving them out is something AkuShaper itself does.
- The egg's header in order, for the planner (values verbatim; this is the proven set — `p01`–`p04` become ours):
  ```
  p01 : <len>  p02 : <len over curve>  p03 : <thick>  p04 : <width>  p07 : V4.4
  p55 : 0  p56 : 0  p57 : 0  p43 : c:\machine
  p11 : 15  p12 : 13  p13 : 0  p14 : 28.2  p59 : 0.9400000000000001  p15 : 3.0838964009757846E-4
  p16 : 0.0038074890297145228  p17 : 10.01  p18 : 0.1  p99 : 0.1  p19 : 0.0  p20 : 0.0  p21 : 0.5  p22 : 0.5
  p23 : 1.0  p24 : 200  p25 : 35  p42 : 30  p26 : 300  p70 : 210  p44 : 140.0  p60 : 85.0  p61 : 25.0
  p46 : 8  p47 : 0  noseAngelWings : true  tailAngelWings : false  p62 : -1.0  p63 : -1.0  p64 : -1.0
  p65 : false  p66 : 0.0  p67 : 0.0  p68 : 0.0  p69 : 0.0  p80 : 60.0  p81 : 20.0  p82 : 0.0  p83 : 110.0
  p85 : false  p86 : 0.0  p87 : 180  p88 : 210  p38 : 5  p53 : 0  p41 : false
  p50 : [0.0,0.0,0.0,0.0,0.0,0.0,0.0,0.0,0.0]
  p27 : [120.0,0.0,28.8]  p28 : [257.5,0.0,28.939999999999998]  p29 : [0.0,0.0,66.2]  p30 : [70.0,0.0,40.0]
  p31 : [72.89453357245351,0.0,34.71636112128822]
  then p32, p33, p34, p35
  ```
  (one field per line in the file; shown packed here). Numbers print as Java's `Double.toString` would — a
  plain decimal like `208.28` or `6.604007821671177`, `0.0` for zero; never `NaN`/`Infinity`.

**Reference samples** (the founder's; untrusted data; read only; **never copy them into the repo** — they are other
shapers' boards): `~/Downloads/brd-tests/TEST1-plain-egg.brd` is the plain text of a real file; the scrambled ones
are `~/Downloads/*.brd`. A planner/executor may read TEST1 to see layout; nothing from them goes in a test fixture.

## Where our board comes from

The 3D screen already builds one surface for the export: `buildBoardSurface` → `BoardSurface`
(`lib/geometry/board-surface.ts`), read by `lib/export/cnc-files.ts` through `boardSlices`, `boardFileOutlineLoop`
and `boardProfileLines`, in millimetres, Shape3D axes (x along the board, tail at x = 0, z = 0 at the lowest point
of the bottom). It carries Phase 17's bottom cut, so the slices already include concaves and channels. The `.brd`
must be read off the same surface, so it can never describe a different board from the one on screen. The button
and its tap-time download live in `components/3d/three-d-screen.tsx` (`exportForCnc`, `./export-cnc`), its words in
`components/3d/three-d-copy.ts` (`exportButton`, `exportNote`, `exportDone`, …). Find every browser spec that
presses the export button (e2e/) and move it to the `.brd`.

## Decisions (mine, each for the founder to overrule at his look)

1. **Scrambled like AkuShaper writes it** (not plain text) — both opened, but scrambled is what every AkuShaper
   file is, so it is the safest for other versions.
2. **Curves:** fit smooth cubic Bézier knots through points read off the surface (e.g. Catmull-Rom → Bézier handles,
   or a least-squares fit), enough knots that every knot-to-knot span stays within ~0.5 mm (1/50") of the surface,
   and fewer than ~40 per curve. Corners that are real corners (a channel wall, a swallow's notch, a sharp tail
   corner) keep a non-continuous knot. The outline's fit must keep the wide point and the nose/tail widths exact.
3. **Sections:** the litres' own stations with foam (what `boardSlices` gives), plus the two zero-size end sections.
   A slice inside a swallow's notch has two loops — write the outer (rail-side) half only, as one curve from the
   stringer line out and back; note what we did in the SUMMARY.
4. **Name:** `{stem}.brd` through `boardFileStem` (the same stem every other board download uses).
5. **Words on the 3D page** (plain, in `three-d-copy.ts`): button **"Export .brd File"**; note **"A board file for
   AkuShaper or Shape3D."**; the done line names the file. The "experimental" note goes.
6. Fins are not written (the fields that might hold them are unknown).

## Rules that apply (CLAUDE.md)

- The writer's maths is pure TypeScript with unit tests: the Bézier fit and the `.brd` text in `lib/geometry/` or
  `lib/export/` alongside `cnc-files.ts` (the export folder is where the other file writers already are; geometry
  that fits curves belongs in `lib/geometry/`), MD5/DES in `lib/export/`. No React/browser imports there.
- mm → cm goes through `lib/geometry/units.ts` (add a helper there if none exists); no bare `/ 10` or `25.4`.
- Tests: MD5 and DES vectors; the key/IV pin; scramble → unscramble round trip; **our file unscrambled and read
  back gives the same length, width, thickness and section count**, and every number finite; the outline's widest
  knot equals the board's width/2; a flat preset and a board with a Deep Single Concave + 4 channels both write.
- Vitest's default 5 s per test: keep new tests well inside it under a full-suite load (a full-suite run is heavy;
  several older tests already time out there).
- Plain-English commit messages (the founder is a shaper, not a developer).
- Work in this checkout: `/Users/kontoes/Code/shaper/.claude/worktrees/close-bottom-17` (branch `close-bottom-17`,
  off main 556162ba). Never `cd` into any other folder. `npm run build` does not run in a worktree; `tsc --noEmit`
  here shows two phantom `LayoutProps` errors from missing generated route types — run `npx next typegen` first.
- Not pushed and not merged: the founder looks first.
