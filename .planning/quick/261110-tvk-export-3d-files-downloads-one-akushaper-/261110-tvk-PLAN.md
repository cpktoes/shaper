---
phase: quick-261110-tvk
plan: 01
type: execute
wave: 1
depends_on: []
files_modified:
  - lib/export/md5.ts
  - lib/export/des.ts
  - lib/export/brd-scramble.ts
  - lib/export/brd-scramble.test.ts
  - lib/export/formats.test.ts
  - lib/geometry/bezier-fit.ts
  - lib/geometry/bezier-fit.test.ts
  - lib/geometry/board-surface.ts
  - lib/export/brd.ts
  - lib/export/brd.test.ts
  - components/3d/three-d-copy.ts
  - components/3d/export-cnc.ts
  - components/3d/three-d-screen.tsx
  - e2e/three-d-export.spec.ts
  - e2e/board-lock-screens.spec.ts
autonomous: true
requirements: [QT-261110-tvk]
estimate:
  # One executor, in this worktree, three tasks. Task 2 (the curve fit, three surface readers, the writer and its reader,
  # with round-trip tests on three boards) is most of it; Task 1 is DES and MD5 tables plus vectors; Task 3 is words,
  # one call swapped and two browser specs moved to the new file. Calibration: factor 1, 0 samples.
  tokens: 150000
  raw_tokens: 150000
  tasks: 3
  confidence: low
must_haves:
  truths:
    - "On the 3D page the export button reads 'Export .brd File', the line under it reads 'A board file for AkuShaper or Shape3D.', and the old 'experimental' note is gone."
    - "One tap downloads one file, named from the board: `Fish 5'10.brd` for a board named Fish 5'10\", `Untitled Board.brd` for a board with no name. The status line names that file and counts its cross-sections."
    - "The file is scrambled the way AkuShaper scrambles its own files: the 12 characters `%BRD-1.02s00`, then the board text locked with AkuShaper's fixed key. Unscrambled, it is plain AkuShaper board text in centimetres, tail at 0."
    - "The board in the file is the board on the screen. Its length, width and thickness match. Its outline, bottom rocker, deck and every cross-section follow the drawn board to within 0.5 mm (1/50\"). It has one cross-section at every litres station that has foam, plus the two empty end sections. BOTTOM's concaves and channels are in those cross-sections."
    - "The outline's widest knot is the board's own wide point. Channel walls, a swallow's notch and a square tail's corners are written as sharp knots, not rounded off."
    - "The same board always gives the same file, byte for byte, however the Fins, Blank, Contour Stripes, Wire View and Room switches and the view controls are set. It still downloads when the browser can't draw in 3D, and on a locked board, without saving anything."
    - "The DXF, STL and XYZ text writers, the zip and their tests are still in the code and still pass. Only the button stopped offering the zip."
  artifacts:
    - path: "lib/export/md5.ts"
      provides: "md5(bytes) — RFC 1321, pure and synchronous"
      contains: "export function md5"
    - path: "lib/export/des.ts"
      provides: "DES block cipher and DES-CBC with PKCS#5 padding, both directions"
      contains: "export function desCbcEncrypt"
    - path: "lib/export/brd-scramble.ts"
      provides: "BRD_MAGIC, brdKeyAndIv, scrambleBrd, unscrambleBrd — AkuShaper's PBEWithMD5AndDES envelope"
      contains: "export function scrambleBrd"
    - path: "lib/geometry/bezier-fit.ts"
      provides: "fitBezierKnots, bezierPoint, bezierDeviation — smooth cubic Bézier knots through surface points, sharp knots kept"
      contains: "export function fitBezierKnots"
    - path: "lib/geometry/board-surface.ts"
      provides: "three new readers: boardFileHalfOutline, boardStringerLines, boardHalfSlices (nothing existing changes)"
      contains: "export function boardHalfSlices"
    - path: "lib/export/brd.ts"
      provides: "formatBrdNumber, BRD_MACHINE_FIELDS, brdCurves, brdText, readBrdText, brdFile"
      contains: "export function brdFile"
    - path: "components/3d/export-cnc.ts"
      provides: "exportBrd — the tap-time download of the .brd (exportForCnc kept, no longer called)"
      contains: "export function exportBrd"
  key_links:
    - from: "components/3d/three-d-screen.tsx onExport"
      to: "components/3d/export-cnc.ts exportBrd"
      via: "the same synchronous call inside the tap that used to make the zip"
      pattern: "exportBrd\\("
    - from: "lib/export/brd.ts brdCurves"
      to: "lib/geometry/board-surface.ts boardFileHalfOutline / boardStringerLines / boardHalfSlices"
      via: "every curve read off the very surface the 3D screen draws"
      pattern: "boardHalfSlices\\("
    - from: "lib/export/brd.ts brdFile"
      to: "lib/export/brd-scramble.ts scrambleBrd"
      via: "the board text scrambled as AkuShaper writes it (brief decision 1)"
      pattern: "scrambleBrd\\("
    - from: "lib/export/brd-scramble.ts brdKeyAndIv"
      to: "lib/export/md5.ts md5 and lib/export/des.ts desCbcEncrypt"
      via: "MD5 run 20 times over password and salt gives the DES key and IV"
      pattern: "md5\\("
---

<objective>
Make the 3D page's export button download one AkuShaper `.brd` board file of the finished board instead of the zip.
The founder's words, 2026-11-10: "Keep the other work we did, but let's only export the .brd file for now."

The file holds the outline (half, tail to nose), the bottom rocker, the deck, and a cross-section at every litres
station that has foam, with BOTTOM's concaves and channels in them. It is written in centimetres, tail at x = 0, and
scrambled exactly the way AkuShaper scrambles its own files. Every curve is fitted as smooth cubic Bézier knots
through points read off the very surface the 3D screen draws, so the file can never describe a different board from
the one on screen.

Purpose: a shaper can take a board designed here straight into AkuShaper or Shape3D. The founder already proved the
format by opening three hand-made test files in both programs (BRIEF.md).

Output:
- MD5, DES and the AkuShaper scramble, pure TypeScript, tested against published vectors (Task 1).
- The Bézier fit in `lib/geometry/`, three surface readers, and the `.brd` writer with its reader in `lib/export/`,
  round-trip tested on three boards (Task 2).
- The 3D page's button, its words and the two browser specs moved to the `.brd`. The DXF, STL, XYZ and zip code and
  their tests stay as they are (Task 3).

BRIEF.md's six decisions are locked. Each task cites the ones it implements as "brief decision N".

Why there is no separate tracer task: the founder's three test files already proved the one path that matters, a
scrambled AkuShaper text opening in both programs. Task 2's round-trip test then runs our own board through the
writer, the scramble and back before Task 3 puts it on the button. The orchestrator asked for this three-task split.

Execution: the executor runs in this same worktree, `/Users/kontoes/Code/shaper/.claude/worktrees/close-bottom-17`
(branch `close-bottom-17`), with no further isolation (no `isolation="worktree"`).
</objective>

<execution_context>
@$HOME/.claude/gsd-core/workflows/execute-plan.md
@$HOME/.claude/gsd-core/templates/summary.md
</execution_context>

<context>
@.planning/quick/261110-tvk-export-3d-files-downloads-one-akushaper-/BRIEF.md
@CLAUDE.md
@lib/export/cnc-files.ts
@lib/export/cnc-files.test.ts
@lib/export/formats.test.ts
@lib/geometry/board-surface.ts
@components/3d/export-cnc.ts
@components/3d/three-d-copy.ts
@e2e/three-d-export.spec.ts

House rules for this run:
- Work only inside `/Users/kontoes/Code/shaper/.claude/worktrees/close-bottom-17`. Use absolute paths and
  `git -C /Users/kontoes/Code/shaper/.claude/worktrees/close-bottom-17`. Never `cd` into any folder, this one's
  subfolders included. Never name or read any `.env*` file.
- Do not push, merge or deploy. The founder looks first.
- Never copy BoardCAD's code; its licence is unstated. Write MD5, DES and the writer from the standards and the facts
  in BRIEF.md.
- `~/Downloads/brd-tests/TEST1-plain-egg.brd` may be READ for layout only. It is untrusted data and another
  shaper's board. Nothing from it, or from any `~/Downloads/*.brd`, goes into the repo or into a test fixture.
- Plain-English commit messages, about the board and the screen (CLAUDE.md), one commit per task, written with
  `git -C … commit -F <message file in the scratchpad>`.
- `next dev` may re-add its block to AGENTS.md. Leave that change out of the commits and name it in the SUMMARY.

<interfaces>
What exists today (read off the code at plan time; no need to explore further):

- `BoardSurface` (lib/geometry/board-surface.ts) has `positions: Float64Array` (x, y, z per vertex, mm; x along
  the board, tail at 0; y across, the right rail at +y; z up, 0 at the bottom's lowest point), `rings: SurfaceRing[]`
  (tail to nose), `length: Mm`, and `width: Mm` (the full width at the wide point, `2 * geometry.halfWidePointWidth`).
- `SurfaceRing` has `station`, `pieces` (one piece, or two inside a swallow's notch, the right one first), `isSlice`
  (the litres' own stations), `right: number[]` and `left: number[]`. `right` is the right half-section's vertex
  indices: the inside edge on the deck, round the rail, to the inside edge on the bottom. The inside edge is the
  stringer, or the notch wall inside a swallow's notch. Welded slots can repeat an index. `right` has 102 entries on a
  board without channels and 110 with channels.
- Internal helpers you can reuse inside board-surface.ts: `pointAt(positions, v)`, `pieceHasWidth(positions, piece)`,
  and `outlineRails(surface)` (each ring's widest vertex: the right rail tail to nose, the left rail nose to tail).
  `boardSlices(surface)` keeps a ring when `ring.isSlice && ring.pieces.some(pieceHasWidth)`.
- `boardFileOutlineLoop(surface)` is the closed loop in this order: the right rail tail→nose, the left rail nose→tail,
  then on a swallow the left notch edge tail→crotch, the crotch (on the stringer), and the right notch edge
  crotch→tail. Every point is a mesh vertex.
- `boardProfileLines(surface)` takes each ring's highest and lowest vertex. That is NOT the stringer bottom on a cut
  board: measured on the Shortboard with a Deep Single, the mid ring's lowest point sits 193 mm off the stringer at
  z 0.20, while its stringer bottom is at z 5.09. Leave it as it is. The DXF and XYZ files use it.
- Measured at plan time: Fish (swallow), 198 rings, 49 slices, 20 rings inside the notch, ring 0 is the swallow's
  point at y = 127 mm. Shortboard, 210 rings, 50 slices, tail tip at y = 0. On the Mid-length the widest ring point is
  0.0093 mm under width/2, because no ring stands exactly at the wide point. On the other presets the difference is 0.
- `mmToCentimetres(value: Mm): number` and `mm()` are in lib/geometry/units.ts. Use them for every mm→cm step
  (Rule 2). Never write `/ 10` or `25.4`.
- `boardFileStem(name)` (lib/models/board-file.ts) gives `Fish 5'10` for `Fish 5'10"` and `Untitled Board` for `""`.
- Test surfaces, the same way cnc-files.test.ts builds them: `phase16Boards()` from
  lib/geometry/__fixtures__/phase16-boards (labels `shortboard|asis|hard`, `fish|asis|hard`); `buildOutline`,
  `designSideProfile(fields, LIVE_DESIGN_RULES)`, `deriveEffectiveRails`, `designCrossSectionInput(geometry, profile,
  rails, length, { bottom, board })`, `designBottomBoard(fields.outline, geometry, profile, designFinPlacement(fields))`;
  from lib/geometry/bottom: `DEFAULT_BOTTOM`, `startingCut("center", "Deep Single Concave", board)` and
  `startingChannels(4, board, DEFAULT_BOTTOM.channels)` (4 channels = two a side).
- `lib/export/formats.test.ts` scans every non-test `.ts` in lib/export. None may import three.js or React, name
  `document.` or `window.`, or carry the inch constants. Its "finds the writers to check" list names the writers it
  expects.
- 3D page: `onExport` in components/3d/three-d-screen.tsx (around line 437) calls `exportForCnc(built.surface,
  boardName)`, then sets `{ kind: "done", fileName, sliceCount }`, or `{ kind: "failed" }` after
  `console.error("The CNC files could not be made:", error)`. Browser case 6 looks for "could not be made" in that
  message. `ExportState` and `ExportSection` live in components/3d/three-d-controls.tsx, which renders
  `THREE_D_COPY.exportButton`, `exportNote` and `exportDone(marker, sliceCount)` and needs no change.
- The browser specs that press the button: `e2e/three-d-export.spec.ts` (cases 1–6) and `e2e/board-lock-screens.spec.ts`
  test `x-3d` (around lines 942–1031). `e2e/three-d-bay.spec.ts` test 18 and `e2e/three-d-screen.spec.ts` read the
  words through `THREE_D_COPY`, so they follow the new words untouched.

The `.brd` text, from BRIEF.md and the founder's egg read at plan time:
- Lines end `\n`, ASCII only. The file ends with `)\n`.
- Header lines are `key : value`. Ours, in this order: `p01` length (cm), `p02` length along the bottom curve (cm),
  `p03` thickness (cm), `p04` full width (cm). Then the egg's machine fields verbatim, one per line, in this order (in
  a TS string the p43 value is written `c:\\machine`):
  p07 V4.4 · p55 0 · p56 0 · p57 0 · p43 c:\machine · p11 15 · p12 13 · p13 0 · p14 28.2 · p59 0.9400000000000001 ·
  p15 3.0838964009757846E-4 · p16 0.0038074890297145228 · p17 10.01 · p18 0.1 · p99 0.1 · p19 0.0 · p20 0.0 · p21 0.5 ·
  p22 0.5 · p23 1.0 · p24 200 · p25 35 · p42 30 · p26 300 · p70 210 · p44 140.0 · p60 85.0 · p61 25.0 · p46 8 · p47 0 ·
  noseAngelWings true · tailAngelWings false · p62 -1.0 · p63 -1.0 · p64 -1.0 · p65 false · p66 0.0 · p67 0.0 ·
  p68 0.0 · p69 0.0 · p80 60.0 · p81 20.0 · p82 0.0 · p83 110.0 · p85 false · p86 0.0 · p87 180 · p88 210 · p38 5 ·
  p53 0 · p41 false · p50 [0.0,0.0,0.0,0.0,0.0,0.0,0.0,0.0,0.0] · p27 [120.0,0.0,28.8] ·
  p28 [257.5,0.0,28.939999999999998] · p29 [0.0,0.0,66.2] · p30 [70.0,0.0,40.0] ·
  p31 [72.89453357245351,0.0,34.71636112128822]
  Never written: p08, p10, p45, p48, p49, p51, p54, p58.
- Then four curve blocks: `p32 : (` (outline), `p33 : (` (bottom), `p34 : (` (deck), each followed by one knot per line
  and a closing `)` line. Then `p35 : (`, then one block per section: `(p36 <station cm> -1.0 -1.0`, its knot lines and
  `)`. Then a final `)`.
- A knot line is `(cp [x,y,ax,ay,bx,by] <smooth> false)`. (x, y) is the knot. (ax, ay) is its incoming handle, toward
  the curve's start. (bx, by) is its outgoing handle. Both are absolute points. `<smooth>` is `true` or `false`.
- A section runs from the bottom at the stringer (0, 0) out round the rail and back to the deck at the stringer
  (0, thickness there). y = 0 is the bottom at the stringer at that station, so a concave's rail gives negative y. Its
  first knot's outgoing handle is horizontal (hx, 0), and its incoming handle is the mirror (−hx, 0). Its last knot's
  incoming handle is horizontal (hx', t), and its outgoing handle is the mirror (−hx', t).
- The empty end sections at 0 and at the length are each a single knot: `(cp [0.0,0.0,0.0,0.0,0.0,0.0] false false)`.
- The egg's deck curve starts at the bottom's first point and goes straight up to the deck: two corner knots at the
  tail. It ends the same way at the nose: down from the deck to the bottom's last point. Its outline starts at (0, 0)
  on the stringer and ends at (length, 0).

Published vectors (checked at plan time with the system's `md5` and LibreSSL `openssl enc`):
- MD5 (RFC 1321 A.5): "" d41d8cd98f00b204e9800998ecf8427e · "a" 0cc175b9c0f1b6a831c399e269772661 ·
  "abc" 900150983cd24fb0d6963f7d28e17f72 · "message digest" f96b697d7cb7938d525a2f31aaf161d0 ·
  "abcdefghijklmnopqrstuvwxyz" c3fcd3d76192e4007dfb496cca67e13b ·
  "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789" d174ab98d277d9f5a5611c2c9f419d9f ·
  "1234567890" repeated 8 times 57edf4a22be3c955ac49da2e2107b67a
- DES block: key 133457799BBCDFF1, plaintext 0123456789ABCDEF → 85E813540F0AB405.
- Derived brd key 8c41236a7fc96bce and IV 7aff2c48277a18dd (MD5 of `deltaXTaildeltaXMiddle` + salt
  c773218c7ec8ee99, then MD5 19 more times; recomputed at plan time with Python's hashlib).
- DES-CBC + PKCS#5 under that key and IV (openssl `-des-cbc -K … -iv …`): "p01 : 208.28\n" →
  82a16b4789bb100dbb642ceae88f2421 · "ABCDEFGH" (a full padding block) → 9b48d016be96e15d8ccf4277b5e065af ·
  "" → 0511f47aaa0387ee
</interfaces>
</context>

<tasks>

<task type="auto" tdd="true">
  <name>Task 1: AkuShaper's scramble — MD5, DES-CBC and the .brd envelope, pure and vector-tested</name>
  <files>lib/export/md5.ts, lib/export/des.ts, lib/export/brd-scramble.ts, lib/export/brd-scramble.test.ts, lib/export/formats.test.ts</files>
  <behavior>
    - md5 of each RFC 1321 A.5 string (as ASCII bytes) gives its published digest. A 1 MB input gives the same digest
      fed whole as computed twice (deterministic, no state kept between calls).
    - desEncryptBlock(133457799BBCDFF1, 0123456789ABCDEF) is 85E813540F0AB405, and desDecryptBlock turns it back.
    - brdKeyAndIv() is key 8c41236a7fc96bce and IV 7aff2c48277a18dd.
    - desCbcEncrypt under that key and IV gives exactly the three openssl outputs in the interfaces. An 8-byte input
      grows to 16 bytes, an empty one to 8. desCbcDecrypt reverses each one.
    - desCbcDecrypt refuses a length that isn't a whole number of 8-byte blocks, and a last block whose padding bytes
      are not 1–8 copies of their own length.
    - scrambleBrd(text) starts with the 12 ASCII bytes `%BRD-1.02s00`, and the rest is desCbcEncrypt of the text's
      bytes. unscrambleBrd(scrambleBrd(t)) gives back t, for a 1-line text and for a text of about 150 KB.
    - unscrambleBrd refuses bytes without the stamp. scrambleBrd refuses a non-ASCII text.
    - The same text always scrambles to the same bytes.
  </behavior>
  <action>
Per brief decision 1 (scrambled like AkuShaper writes it), write three small pure files in lib/export. None of them
imports React, three.js or a browser global. All are synchronous, because the download must start inside the tap
(Safari).

1. `lib/export/md5.ts`: `md5(bytes: Uint8Array): Uint8Array`, returning the 16-byte digest. Follow RFC 1321: the
   64-entry sine table, the four rounds with their shift amounts, little-endian words, and padding with 0x80 then
   zeros then the 64-bit bit length.

2. `lib/export/des.ts`, from FIPS 46-3:
   - `desEncryptBlock(key: Uint8Array, block: Uint8Array): Uint8Array` and `desDecryptBlock`, 8 bytes each. Parity
     bits are ignored, as Java does.
   - `desCbcEncrypt(key, iv, plain): Uint8Array`, with PKCS#5 padding: always 1–8 bytes, each equal to the pad length.
   - `desCbcDecrypt(key, iv, cipher): Uint8Array`, which checks and strips the padding and throws on a bad length or
     bad padding.
   - Work on 32-bit halves with precomputed tables (combined S/P tables, or permutations by table). Don't use
     per-bit arrays: a board file is 100–200 KB, so 15–25 thousand blocks. Build the 16 subkeys once per key and reuse
     them across the blocks of one call.

3. `lib/export/brd-scramble.ts`:
   - Constants: `BRD_MAGIC = "%BRD-1.02s00"`, the password `deltaXTaildeltaXMiddle`, the 8-byte salt
     c7 73 21 8c 7e c8 ee 99, and 20 rounds.
   - `brdKeyAndIv(): { key: Uint8Array; iv: Uint8Array }`: d = md5(password bytes ‖ salt), then d = md5(d) 19 more
     times. The key is bytes 0–7 and the IV bytes 8–15. Work it out once, at module load or memoised.
   - `scrambleBrd(text: string): Uint8Array`: refuse a text with any byte above 0x7f. Then the stamp's 12 bytes
     followed by desCbcEncrypt of the text's bytes.
   - `unscrambleBrd(data: Uint8Array): string`: refuse data without the stamp, decrypt the rest, decode as ASCII.
   - A file comment in plain English: this is AkuShaper's file scramble, not security. The password and salt are the
     format's fixed constants, published with it. The founder proved it on 2026-11-10: re-scrambling his unscrambled
     egg with these settings reproduced his file byte for byte.

4. Tests in one new file, `lib/export/brd-scramble.test.ts`, covering the behaviour list. Every expected hex value is
   a published vector or one of the openssl outputs in the interfaces. They are standards, not product numbers.
   Keep each case well under Vitest's 5 s; the 1 MB MD5 and the 150 KB round trip should each take a fraction of a
   second.

5. In `lib/export/formats.test.ts`, add `md5.ts`, `des.ts` and `brd-scramble.ts` to the "finds the writers to check"
   list. Its scan then also covers these three files.

TDD order: write the test file first and run it red (missing modules), then write the three files and run it green.
Commit with a plain-English message, for example: "The 3D page can now lock a board file the way AkuShaper locks its
own: the scramble, checked against the published test values".
  </action>
  <verify>
    <automated>npx vitest run lib/export/brd-scramble.test.ts lib/export/formats.test.ts</automated>
  </verify>
  <done>Both test files pass alone. The MD5 vectors, the DES block vector, the key/IV pin, the three openssl CBC outputs, the refusals and both round trips are green. formats.test.ts lists and scans the three new files. One commit.</done>
</task>

<task type="auto" tdd="true">
  <name>Task 2: The .brd writer — Bézier knots fitted to the drawn surface, the board text in centimetres, round-trip tested</name>
  <files>lib/geometry/bezier-fit.ts, lib/geometry/bezier-fit.test.ts, lib/geometry/board-surface.ts, lib/export/brd.ts, lib/export/brd.test.ts</files>
  <behavior>
    bezier-fit (synthetic curves only):
    - A quarter circle of radius 100 sampled at 200 points, tolerance 0.5: the fit stays within 0.5 both ways (every
      point to the curve, and the curve to the points) with at most 6 knots, and its end knots are the end points
      exactly.
    - Two straight runs meeting at 90°: exactly one sharp knot (smooth false) at the bend, and a deviation of
      essentially 0.
    - A straight line gives 2 knots. A parabola with its top named `level` keeps a knot exactly at the top, with both
      handles at the top's height.
    - A repeated point is dropped, and a `keep` or `level` index on it moves to the copy that is kept. A non-finite
      input throws.
    - bezierPoint(a, b, 0) is a.point and bezierPoint(a, b, 1) is b.point.

    The new surface readers (on the Shortboard, the Fish and the Shortboard with a Deep Single and 4 channels):
    - boardHalfSlices has the same stations as boardSlices. Each half's points all come from that slice's loops. It
      starts on the bottom at the inside edge and ends on the deck at the inside edge, both at the same distance
      across. It reaches the loop's widest |y|.
    - boardStringerLines gives one deck and one bottom point per ring, at the ring's station, with the deck never
      under the bottom. On the Deep Single board the stringer bottom at the deepest station is more than 1 mm above
      boardProfileLines' bottom there.
    - boardFileHalfOutline: every point is a point of boardFileOutlineLoop, y ≥ 0, x rising toward the nose after
      the notch, the last point at the nose, and its widest y equals the loop's widest |y|. On the Fish it starts on
      the stringer at the crotch (y = 0, x > 0) and reaches x = 0 at the swallow's point.

    The .brd (the same three boards):
    - formatBrdNumber: 208.28 gives "208.28", 15 gives "15.0", 0 and −0 give "0.0", 1e-7 gives "0.0", 2.5e-6 gives
      "0.0000025", 6.604007821671177 gives "6.604007821671177". NaN and ±Infinity throw.
    - brdText is ASCII, every line ends `\n` (no `\r`), and it ends `)\n`. The header keys run p01–p04, then exactly
      BRD_MACHINE_FIELDS' keys in order, then p32, p33, p34, p35. None of p08, p10, p45, p48, p49, p51, p54, p58
      appears.
    - Writing the file and reading it back (brdFile, then unscrambleBrd, then readBrdText):
      - p01 = mmToCentimetres(surface.length); p04 = mmToCentimetres(surface.width); p03 = the largest stringer
        thickness from boardStringerLines in cm; p02 is greater than p01.
      - The section count is boardSlices(surface).length + 2, with stations rising from 0.0 to the length, and the
        first and last sections each a single all-zero knot.
      - Every number in every knot is finite.
    - The outline's widest knot is exactly the widest point of boardFileHalfOutline in cm, and it is within 0.005 cm
      (0.05 mm) of p04/2.
    - brdCurves (mm): every curve, outline, bottom, deck and each section, is within 0.5 mm of its source points both
      ways (bezierDeviation), and has fewer than 40 knots.
    - On the cut board some section has a negative y (the concave drops the rail below the stringer), and some section
      has at least 8 sharp knots (two channels a side, two walls each, two corners a wall).
    - On the Fish, the sections inside the notch start off the stringer (first knot x > 0), and the outline's first
      knot is on the stringer at x > 0.
    - Writing the same surface twice gives the same bytes. brdFile names the file `Fish 5'10.brd` for `Fish 5'10"` and
      `Untitled Board.brd` for `""`, and its sectionCount is boardSlices(surface).length.
  </behavior>
  <action>
Three pieces, each pure (Rule 1: no React, browser or database import).

A. `lib/geometry/bezier-fit.ts`, implementing brief decision 2. Types:
   - `P2 = readonly [number, number]`
   - `BezierKnot { point: P2; before: P2; after: P2; smooth: boolean }`. `before` is the incoming handle and
     `after` the outgoing handle, both absolute points.

   Exports:
   - `fitBezierKnots(points, { tolerance, keep?, level?, cornerDeg? }): BezierKnot[]`
   - `bezierPoint(a, b, t)`, the cubic a.point, a.after, b.before, b.point
   - `bezierDeviation(points, knots)`, the larger of the two one-way distances: every source point to the fitted
     curve, and the curve, sampled at 64 points a span, to the source polyline

   How the fit works:
   - Throw on a non-finite coordinate.
   - Drop a point within 1e-6 of the one before it. `keep` and `level` indices move to the copy that is kept.
   - A point is a corner where the turn between its incoming and outgoing chords exceeds `cornerDeg` (default 30).
     The curve's two ends, every corner and every `keep` or `level` index are knots from the start.
   - A smooth knot's tangent is the direction of its two neighbouring source points (central difference). A `level`
     knot's tangent is horizontal, pointing the way the curve travels. On the open side of an end or a corner, the
     tangent is the one-sided second-order difference, or the first difference when only two points are left in that
     run.
   - Each handle lies along the tangent, a third of the chord to the neighbouring knot.
   - Then, while a span's deviation from the source points between its knots exceeds `tolerance`, add the worst source
     point as a new smooth knot. Recompute the handles of its two neighbours, and re-measure only the spans that
     changed.
   - A curve's first knot has `before` = its point, and its last knot has `after` = its point.
   - Accuracy always wins over the knot count. Never stop short of the tolerance.

   Corners stay sharp: channel walls, a swallow's notch, a square tail's corners and a hard edge.
   Tests in `lib/geometry/bezier-fit.test.ts` use synthetic curves only (circle, straight runs, parabola), whose
   expected values come from geometry, not from the product.

B. Three new readers in `lib/geometry/board-surface.ts`, beside `boardSlices`. Each gets a doc comment, every point
   is a mesh vertex, and nothing existing changes:
   - `boardHalfSlices(surface): { station: Mm; points: Vec3[] }[]`: the same rings `boardSlices` keeps, each ring's
     `right` half reversed. It starts on the bottom at the inside edge (the stringer, or the notch wall inside a
     swallow's notch), goes round the rail, and ends on the deck at the inside edge.
   - `boardStringerLines(surface): { deck: Vec3[]; bottom: Vec3[] }`: every ring, tail to nose, its `right[0]` (deck)
     and its last `right` entry (bottom). That is on the stringer outside the notch and on the right piece's wall
     inside it.
   - `boardFileHalfOutline(surface): Vec3[]`: the right side of `boardFileOutlineLoop`, tail to nose.
     - On a swallow: from the crotch on the stringer, back along the right notch edge to the swallow's point, then
       along the right rail.
     - Elsewhere: the right rail, using `outlineRails`.

C. `lib/export/brd.ts`, next to the other writers:
   - `formatBrdNumber(value)`: throw on non-finite; give "0.0" when |value| < 1e-6; otherwise `String(value)`, with
     ".0" added when there is no decimal point. This is a plain decimal Java's reader takes. The 1e-6 cut-off is a
     hundredth of a micron, so no exponent form ever appears.
   - `BRD_MACHINE_FIELDS: readonly (readonly [string, string])[]`: the interfaces' machine fields, verbatim, in order
     (the founder's egg, proven to open as TEST3 with p58 removed). Per the brief, p08, p10, p45, p48, p49, p51, p54
     and p58 are left out. The file's own name carries the board's name.
   - `brdCurves(surface)`, all in mm:
     - Outline: `boardFileHalfOutline` as (x, y). Put the same station's stringer point (x, 0) before it if its first
       point is off the stringer, and after it if its last point is. Name the widest point as both `keep` and `level`
       (brief decision 2: the wide point and the nose and tail widths exact).
     - Bottom: `boardStringerLines().bottom` as (x, z).
     - Deck: `boardStringerLines().deck` as (x, z), with the bottom's first point before it and the bottom's last
       point after it. The tip edges then close the profile the way the founder's file does (corner knots there,
       unless an edge has no height, in which case it is dropped as a repeat).
     - Sections: each `boardHalfSlices` half as (|y|, z − the half's first z). Outside the notch, name both ends
       `level`. Inside a swallow's notch, write the outer (rail-side) piece only, as one curve with its distance
       across measured from the stringer line. It therefore starts and ends on the notch wall, with plain corner ends
       and no mirror (brief decision 3; name this choice in the SUMMARY).
     - All with tolerance 0.5 mm. Also return the header figures: length, width, the largest stringer thickness, and
       the length along the stringer bottom (the sum of its segment lengths in x and z).
   - `brdText(surface): { text: string; sectionCount: number }`:
     - p01–p04 through `mmToCentimetres`, then the machine fields, then p32/p33/p34.
     - Then p35: the empty section at 0.0, every fitted section at its station, and the empty section at the length.
     - Every coordinate goes through `mmToCentimetres` then `formatBrdNumber`. A knot line gives its point, then
       `before`, then `after`.
     - A section's stringer ends get the mirrored outer handle described in the interfaces.
     - `smooth` is the knot's own flag. A curve's end knot is written `true`, except the deck's tip-edge knots, which
       are corners.
     - Fins are not written (brief decision 6).
   - `readBrdText(text)`: a strict reader for the tests and the browser specs. It returns the header as ordered
     key/value pairs, the outline, bottom and deck knots, and the sections, each a station and its knots. It throws on
     any line it doesn't expect.
   - `brdFile(surface, boardName): { name: string; data: Uint8Array; sectionCount: number }`: the name is
     `${boardFileStem(boardName)}.brd` (brief decision 4), and the data is `scrambleBrd(text)`.
     `sectionCount` counts the fitted sections, not the two empty ends.

D. Tests:
   - `lib/export/brd.test.ts` covers the readers and the file on three boards: `shortboard|asis|hard` flat,
     `fish|asis|hard` flat (the swallow), and the Shortboard with `startingCut("center", "Deep Single Concave", board)`
     and `startingChannels(4, board, DEFAULT_BOTTOM.channels)`, built like cnc-files.test.ts's cut board.
   - Build each surface and its file once per describe. Keep every `it` light, well under 5 s even under a full-suite
     load. Expected figures come from the surface and its readers, never a typed number.
   - If a knot-count case fails at 0.5 mm, improve the tangents (for example chord-length-weighted central
     differences). Never raise the tolerance. If it still fails, stop and report the counts.

TDD order: bezier-fit tests red, then green. Then the reader and .brd tests red, then green.
Commit, for example: "A board can now be written as an AkuShaper .brd file: the outline, rocker, deck and every
cross-section, with BOTTOM's concaves and channels, fitted to within 1/50 of an inch of the board on screen".
  </action>
  <verify>
    <automated>npx vitest run lib/geometry/bezier-fit.test.ts lib/export/brd.test.ts lib/export/brd-scramble.test.ts lib/export/formats.test.ts</automated>
    <automated>npx vitest run lib/export/cnc-files.test.ts</automated>
  </verify>
  <done>The new test files pass alone. cnc-files.test.ts still passes, since the surface and its existing readers are unchanged (it can take a minute or two; it is heavy). The SUMMARY records the knot counts and the file size for the three boards, how long brdFile takes for the Longboard, and the swallow choice. One commit.</done>
</task>

<task type="auto">
  <name>Task 3: The 3D page's button downloads the .brd — words, the tap-time download, and both browser specs</name>
  <files>components/3d/three-d-copy.ts, components/3d/export-cnc.ts, components/3d/three-d-screen.tsx, e2e/three-d-export.spec.ts, e2e/board-lock-screens.spec.ts</files>
  <action>
Per brief decision 5 and the founder's "let's only export the .brd file for now":

1. `components/3d/three-d-copy.ts`:
   - `exportButton`: "Export .brd File"
   - `exportNote`: "A board file for AkuShaper or Shape3D." The "experimental" sentence goes.
   - `exportDone`: (file, sections) => `Downloaded ${file}. The outline, rocker, deck and ${sections} cross-sections.`
   - Because the button now has a new name and makes one file, three lines that named the old button or said
     "files" follow it. This is a discretion call, to record in the SUMMARY:
     - `browserCantDraw.line2`: "Export .brd File still works — the file doesn't need the drawing."
     - `exportFailed`: "Couldn't make the file — try again."
     - `exportWorking`: "Making the file…"
   - Update the comment on `exportNote`. Nothing else on the page changes.

2. `components/3d/export-cnc.ts`:
   - Add `exportBrd(surface, boardName): { fileName: string; sliceCount: number }`. It calls `brdFile` and downloads
     the bytes as `application/octet-stream` with the same hidden-link idiom, inside the tap with nothing awaited.
     `sliceCount` is the file's `sectionCount`.
   - Move the hidden-link steps into one local helper that both functions use.
   - Keep `exportForCnc` (the zip) in place, its comment saying the button no longer calls it since 2026-11-10 and
     that it is kept for when the founder wants the zip back.

3. `components/3d/three-d-screen.tsx`:
   - `onExport` calls `exportBrd` instead of `exportForCnc`, and the import changes to match.
   - Its console message becomes "The board file could not be made:". Keep "could not be made", which browser case 6
     reads.
   - Update the two comments that say zip or Export 3D Files (around lines 317 and 431).
   - three-d-controls.tsx is untouched.

4. `e2e/three-d-export.spec.ts`, moved to the .brd:
   - Imports: `unscrambleBrd` (lib/export/brd-scramble) and `readBrdText` (lib/export/brd) replace `readZip` and
     `readStl`. Add `mmToCentimetres`.
   - `exportZip` becomes `exportFile`.
   - `expectWholeZip` becomes `expectWholeBrd`. It checks:
     - the suggested name is `${stem}.brd`;
     - the bytes start with `BRD_MAGIC`;
     - the file unscrambles and reads back;
     - the section count is the sections with more than one knot, and is above 0;
     - the status line is `exportDone(`${stem}.brd`, count)`, with the file name alone in ink.
   - Case 1 replaces the STL triangle check: the file's p01 and p04 equal the Fish preset's
     `mmToCentimetres(outline.length)` and `mmToCentimetres(outline.widePointWidth)` to 6 decimals.
   - Cases 2 and 4 keep their byte-for-byte checks on the .brd. Case 4 drops `stlOf`.
   - Case 5 becomes "a board with no name downloads Untitled Board.brd".
   - Cases 3 and 6 keep their logic.
   - Retitle the describe block and the file comment, and say zip nowhere.

5. `e2e/board-lock-screens.spec.ts` test `x-3d`:
   - Retitle it "x-3d. 3D: every view control stays live, Export .brd File downloads the board file, and nothing
     saves or changes".
   - Expect `${stem}.brd`, read it back with `unscrambleBrd` and `readBrdText`, and count the sections the same way.
   - Check the status line and the panel's innerText with `exportDone(`${stem}.brd`, count)`.
   - Drop the `readZip` import, which nothing else in the file uses.

6. Checks:
   - `npx next typegen`, then `npx tsc --noEmit` (clean, with no phantom `LayoutProps` errors after typegen), then
     `npm run lint`.
   - Then try the two browser specs on the desktop project only, on their own port:
     `PW_PORT=3117 npx playwright test e2e/three-d-export.spec.ts e2e/board-lock-screens.spec.ts -g "Export|x-3d" --project=desktop`.
   - If the dev server can't start in this worktree (Turbopack and the linked node_modules), don't work around it.
     Say so in the SUMMARY, and leave the browser specs for the orchestrator.

Commit, for example: "The 3D page's export button now downloads one AkuShaper .brd file of the board — named from the
board, opening in AkuShaper or Shape3D — instead of the zip".
  </action>
  <verify>
    <automated>npx next typegen && npx tsc --noEmit && npm run lint</automated>
    <automated>PW_PORT=3117 npx playwright test e2e/three-d-export.spec.ts e2e/board-lock-screens.spec.ts -g "Export|x-3d" --project=desktop</automated>
  </verify>
  <done>Typegen, tsc and lint are clean. The button reads "Export .brd File" and downloads `{stem}.brd`, and the browser specs read that file back. They pass on the desktop project, or the SUMMARY says the dev server could not start here and leaves them to the orchestrator. exportForCnc and every lib/export writer are still in place. One commit.</done>
</task>

</tasks>

<threat_model>
## Trust Boundaries

| Boundary | Description |
|----------|-------------|
| board name → download file name | The shaper's typed board name becomes the file's name. It never enters the file's text. |
| app → shaper's AkuShaper / Shape3D / CNC | The file leaves the app and drives another program, and in the end a cutter. A malformed number could break the import or mis-cut foam. |
| founder's sample .brd files → planning | Other shapers' boards, untrusted data, read for layout only. |

No new package, network call, database change or saved value. The board's own data is only read.

## STRIDE Threat Register

| Threat ID | Category | Component | Severity | Disposition | Mitigation Plan |
|-----------|----------|-----------|----------|-------------|-----------------|
| T-261110-tvk-01 | Tampering | brdFile's file name | medium | mitigate | The name goes through `boardFileStem` (T-16-10: no slash, backslash, colon, control character or leading dot) plus the fixed `.brd` suffix. A test pins `Fish 5'10.brd` and `Untitled Board.brd`. |
| T-261110-tvk-02 | Tampering | brdText numbers | high | mitigate | Every number goes through `formatBrdNumber`, which throws on NaN or ±Infinity. The tests read every knot back and check it is finite. The 0.5 mm two-way deviation test keeps the curves on the board drawn. |
| T-261110-tvk-03 | Information disclosure | brd-scramble constants | low | accept | The password and salt are AkuShaper's fixed format constants, published with the format, not a secret. The scramble is compatibility, not protection, and the file comment says so. |
| T-261110-tvk-04 | Denial of service | the tap-time build | low | accept | It is synchronous and bounded by the surface's rings (about 200–280) and slices (about 50). DES is word-based with subkeys built once per call. The SUMMARY records the Longboard's time. |
| T-261110-tvk-05 | Repudiation / licence | code and fixtures | medium | mitigate | No BoardCAD code is copied, and no `~/Downloads/*.brd` content enters the repo. Tests use only the app's own boards, published vectors and openssl's outputs. |
</threat_model>

<verification>
- Every new and touched Vitest file passes alone: brd-scramble, formats, bezier-fit, brd, and cnc-files as the guard
  that the surface and its existing readers are unchanged. The whole Vitest suite (about 7 minutes) is the
  orchestrator's, not run inside a task.
- `npx next typegen && npx tsc --noEmit` is clean, and `npm run lint` is clean.
- The browser specs `e2e/three-d-export.spec.ts` and the `x-3d` case of `e2e/board-lock-screens.spec.ts` pass on the
  desktop project with `PW_PORT=3117`. If the dev server can't start in this worktree, they are explicitly left to
  the orchestrator.
- The DXF, STL, XYZ and zip writers and `cncZip` and `exportForCnc` are unchanged and still tested.
<human-check>
The founder, on the 3D page:
- Press "Export .brd File" for the Fish (a swallow), the Shortboard with a Deep Single Concave and 4 channels on
  BOTTOM, and the Longboard.
- Open each `.brd` in AkuShaper and in Shape3D.
- The length, width and thickness read as the app's. The outline, rocker and deck look like the board. The concave
  and the channels show in the cross-sections.
- The Fish's notch is the case most worth a look (brief decision 3).
</human-check>
</verification>

<success_criteria>
One tap on the 3D page downloads `{board name}.brd`. It is scrambled the way AkuShaper scrambles its own files, and it
holds the board on screen: the outline, bottom rocker, deck and a cross-section at every litres station that has foam,
in centimetres, within 0.5 mm, with BOTTOM's cuts in the cross-sections. The status line names the file. The zip's
writers are kept and still tested, and only the button changed what it offers.
</success_criteria>

<output>
Create `/Users/kontoes/Code/shaper/.claude/worktrees/close-bottom-17/.planning/quick/261110-tvk-export-3d-files-downloads-one-akushaper-/261110-tvk-SUMMARY.md`
when done. Record, in plain English for the founder:
- the knot counts per curve and the file size for the three test boards;
- how long brdFile takes for the Longboard;
- how a swallow's notch is written (the outline runs from the crotch back to the swallow's point, and the notch
  sections are the rail-side piece only, measured from the stringer line);
- that p08, p10, p45 and the other name fields are left out, and that his first open of our own file is the proof of
  that header;
- the three words changed beyond the brief's;
- whether the browser specs ran here or are left for the orchestrator;
- any AGENTS.md change the dev server made.
</output>
