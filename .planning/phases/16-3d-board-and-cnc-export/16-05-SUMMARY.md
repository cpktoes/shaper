---
phase: 16-3d-board-and-cnc-export
plan: 05
subsystem: export (CNC files)
status: complete
tags: [3d, export, cnc, dxf, stl, xyz, zip, shape3d, D-14, D-16, D-24, D-26]
requires:
  - "16-03: buildBoardSurface, boardSlices, boardOutlineLoop, boardProfileLines, meshCheck, Vec3"
provides:
  - "cncFiles, cncZip, CncFile, CNC_LAYERS, sliceFileName (lib/export/cnc-files.ts)"
  - "writeZip, readZip, crc32, ZIP_DOS_DATE (lib/export/zip.ts)"
  - "writeStl, readStl, stlHeader (lib/export/stl.ts)"
  - "writeDxf, readDxf and the DXF flag constants (lib/export/dxf.ts)"
  - "writeXyz, readXyz, formatMm, CRLF (lib/export/xyz.ts)"
  - "boardFileStem: the one stem the board file and the CNC export share (lib/models/board-file.ts)"
affects: [16-11, 16-12, 16-13]
tech-stack:
  added: []
  patterns:
    - "Each file format is a pure writer with its own reader; the board's files are tested only through those readers"
    - "Every curve in the files is read off the drawn mesh (boardSlices / boardOutlineLoop / boardProfileLines)"
    - "Source-grep prohibition test builds its module names and constants at run time so it never matches itself"
key-files:
  created:
    - lib/export/zip.ts
    - lib/export/stl.ts
    - lib/export/dxf.ts
    - lib/export/xyz.ts
    - lib/export/cnc-files.ts
    - lib/export/cnc-files.test.ts
    - lib/export/formats.test.ts
    - .planning/phases/16-3d-board-and-cnc-export/pictures/16-05-files-inside.png
    - .planning/phases/16-3d-board-and-cnc-export/pictures/16-05-pictures-source.tar.gz
  modified:
    - lib/models/board-file.ts
    - lib/models/board-file.test.ts
decisions:
  - "Numbers in the DXF and the text files are always written with exactly three decimals (12.000, never 12), and -0.000 is written 0.000"
  - "The STL header shortens a long stem so the closing ' mm' always fits in its 80 bytes, padded with spaces"
  - "The profile text file holds the deck line and the bottom line both tail to nose (two curves, one blank line between), as 16-03's boardProfileLines gives them"
  - "A closed curve in a text file does not repeat its first point at the end; the DXF marks it closed with flag 9"
  - "Slice file names come from one exported function, sliceFileName, so the past-99 three-digit rule is tested without a 100-slice board"
metrics:
  duration: "about 30 minutes"
  completed: 2026-11-04
estimate:
  tokens: 100000
actuals:
  tokens: 12800
  tasks: 2
  commits: 3
---

# Phase 16 Plan 05: The CNC files — Summary

One board now leaves as one zip: a DXF wireframe, an STL of the very triangles the 3D screen draws, and a set of
plain text files (outline, profile, one per slice). Everything is in millimetres and in Shape3D's own frame, and the
zip is named exactly as Save board as file… names the board. Each format has its own reader in the tests, and all
four presets plus every swallow of the 40 test boards read back to the same points.

## What changes for the founder

- **Nothing on any screen changes yet.** These are the files the Export for CNC… button will hand over; that
  button is plan 16-11.
- **One zip, three forms of the same board.** `Fish 5'10"` downloads as `Fish 5'10-3d.zip`. Inside it:
  - `Fish 5'10.dxf`, a wireframe with the outline, the stringer's deck and bottom lines, and every slice. Each
    family is on its own layer (OUTLINE, PROFILE-DECK, PROFILE-BOTTOM, SLICES), so if Shape3D gets confused by
    everything at once you can give it the slices alone.
  - `Fish 5'10.stl`, the 3D board itself, triangle for triangle what the screen draws. It's closed, with no holes.
  - `Fish 5'10-outline.txt` and `Fish 5'10-profile.txt` (the deck line, a blank line, then the bottom line).
  - `Fish 5'10-slice-01.txt` and on, one per litres station with foam, counted from the tail (about 50 per board).
    A slice inside a swallow's notch holds both pieces.
- **Shape3D's frame, millimetres.** The tail is at x = 0 and the nose at the board's length, y runs across, z runs
  up toward the deck, and the lowest point of the bottom is z = 0. Text files are `x y z` per line to three
  decimals. No inches anywhere, and nothing is converted on the way out.
- **The files are the board you see and the litres you're quoted.** The surface they're read from already follows
  D-30 (the hard edge's start and end settings) and D-31 (inside the fade the litres count exactly the foam the 3D
  board draws). So the files ARE the board on screen, and they hold the litres VOLUME quotes.
- **Bare board only.** No fins and no blank, whatever the screen's switches say (D-16).
- **Same name both ways.** The board file and the CNC zip now share one name-cleaning step, so the two downloads
  can never name a board differently. A name like `../../x` or `C:\x` can't put a file outside the zip's top folder.
- **The same board always zips to the same bytes**, because the zip carries one fixed date (1 January 2026).
- **One thing to know for the picture.** On the Fish only **slice 01** is two pieces. The notch is 2¾" deep. The
  first litres station with foam sits about 1⅜" from the tail, inside the notch. The next one is the notch's own
  crotch (the litres always put a station at the tail cut's corner), where the two pieces meet into one. So "the
  swallow's slices near the tail are two pieces" holds for exactly one slice on this board. A deeper notch would
  show more.

## Sizes and times per preset (as their cards open)

Run with scratch `export-samples.ts` (archived). The time is `cncZip` **including** `buildBoardSurface` and the whole
board's maths: the median of 7 runs in Node after a warm-up. This machine is shared with a sibling executor, a
go-live suite and the founder's review server (load 15 to 95 during this plan), so treat the times as upper bounds.
The research measured 123–187 ms. A phone is commonly 2–4× slower, which is still well inside one tap. The real
iPhone check is the founder's, in 16-12.

| Preset | Zip | Size | Slices | DXF | STL (triangles) | Text set | cncZip ms (median of 7) |
|---|---|---:|---:|---:|---:|---:|---:|
| Shortboard | `Shortboard-3d.zip` | 4.75 MB (4,979,223 B) | 50 | 0.72 MB | 3.78 MB (79,184) | 257 KB | 112 |
| Fish | `Fish-3d.zip` | 4.49 MB (4,704,086 B) | 49 | 0.70 MB | 3.53 MB (74,062) | 253 KB | 141 |
| Mid-length | `Mid-length-3d.zip` | 5.30 MB (5,562,631 B) | 49 | 0.71 MB | 4.33 MB (90,900) | 257 KB | 164 |
| Longboard | `Longboard-3d.zip` | 6.09 MB (6,386,135 B) | 50 | 0.74 MB | 5.09 MB (106,656) | 267 KB | 152 |

The four sample zips are in the scratchpad only (never in the repo), for opening in Shape3D's trial:

- /private/tmp/claude-501/-Users-kontoes-Code-shaper/aca08098-d213-4b0a-9c2f-b7dd43fd982d/scratchpad/p16-05/zips/Shortboard-3d.zip
- /private/tmp/claude-501/-Users-kontoes-Code-shaper/aca08098-d213-4b0a-9c2f-b7dd43fd982d/scratchpad/p16-05/zips/Fish-3d.zip
- /private/tmp/claude-501/-Users-kontoes-Code-shaper/aca08098-d213-4b0a-9c2f-b7dd43fd982d/scratchpad/p16-05/zips/Mid-length-3d.zip
- /private/tmp/claude-501/-Users-kontoes-Code-shaper/aca08098-d213-4b0a-9c2f-b7dd43fd982d/scratchpad/p16-05/zips/Longboard-3d.zip

macOS's own `unzip -t` reads all four with "No errors detected". `unzip -l` lists the entries dated 01-01-2026 00:00.

## Tasks

| Task | Name | Commit | Files |
| ---- | ---- | ------ | ----- |
| 1 (tracer) | One board's surface out as a zip with its STL, read back whole, the shared file name included | b47cf900 | board-file.ts, zip.ts, stl.ts, cnc-files.ts, cnc-files.test.ts |
| 2 | The DXF wireframe and the XYZ text set in the same zip, every curve read off the drawn mesh | 0ba3f9f0 | dxf.ts, xyz.ts, cnc-files.ts, cnc-files.test.ts, formats.test.ts, board-file.test.ts |
| 3 | The founder sees what is inside the files (checkpoint) | 91f33784 (picture) | pictures/16-05-files-inside.png, 16-05-pictures-source.tar.gz |

Tracer gate: after Task 1, the Fish's zip read back with every CRC good. The STL's count equalled
`surface.triangleCount`, and welding identical float32 corners gave `meshCheck` all zeros. The header didn't begin
with `solid`, and zipping the same board twice gave the same bytes. The full suite was green (timeouts aside, below)
before Task 2 began.

## Verification

- `npx vitest run lib/export lib/models/board-file.test.ts`: 132 passed. That covers the tracer (7), the name
  guards (7), the full-export sweep on 16 boards (every `asis` and `swallow` board of the 40, Hard Edge on and off),
  the slice-name rules (3), the four formats byte by byte, the source-grep prohibitions, and the `boardFileStem` cases.
- What the sweep proves on each board:
  - The zip's names are exactly D-14's set, in order, with every CRC good, and `sliceCount` equals the slice files.
  - The slices sit at exactly the litres stations with foam (`crossSectionStations` filtered by `foamHalfWidth`).
    On a swallow, slice 01 is two pieces and isn't the tail tip.
  - Every slice point, read back, is a vertex of the mesh to three decimals, on its station.
  - The outline file is `boardOutlineLoop`, and the profile file is the deck then the bottom.
  - The DXF holds one OUTLINE (flag 9), one PROFILE-DECK and one PROFILE-BOTTOM (flag 8), and one SLICES (flag 9)
    per loop, every vertex flagged 32, each at the same points.
  - The STL's corners run from x = 0 to the board's length, its lowest z is the bottom line's lowest (0.000), and
    the deck is never under the bottom.
- The CRC-32 is checked against Node's own `zlib.crc32`, and the sample zips pass macOS `unzip -t`.
- `npm test`: 168 files; the second run gave 7234 passed, 10 failed, 2 skipped. All 10 failures were "Test timed
  out in 30000ms" in the known heavy sweeps (blank-fit, finished-rail, rack-art, round-tip, rack-stand-in), at
  machine load around 95. Run alone, all five files pass (644 + 34 tests). No assertion failed.
- `npx tsc --noEmit`: 0 errors. `npm run lint`: 0 errors (the one warning in `lib/db/import-designs-action.test.ts`
  was there before this plan).
- `git diff --stat 4f0664d8 HEAD -- package.json package-lock.json components app e2e lib/geometry .planning/STATE.md .planning/ROADMAP.md`
  is empty.
- `grep -rcE "25\.4|304\.8|from ['\"](three|react)" lib/export --include=*.ts --exclude=*.test.ts` prints 0 for
  every file.

## The picture

`.planning/phases/16-3d-board-and-cnc-export/pictures/16-05-files-inside.png` is drawn from `Fish-3d.zip` (the Fish
as its card opens: swallow, Hard Edge on), read back through `readZip`, `readDxf` and `readXyz`. It shows:

- the DXF's OUTLINE from above at true scale, with a grey line at each of the 49 slice stations;
- PROFILE-DECK and PROFILE-BOTTOM from the side, drawn 4× taller than true, with z = 0 dashed;
- all 49 slices end on, overlaid at true scale (tail warm, nose cool);
- every slice file on its own, in file order, each to its own scale;
- the zip's file list with sizes: `Fish.dxf` 718.8 KB (53 polylines), `Fish.stl` 3.53 MB (74,062 triangles),
  `Fish-outline.txt`, `Fish-profile.txt`, and `Fish-slice-01.txt` to `Fish-slice-49.txt` at 4.5–5.0 KB each. That's
  53 files, every CRC good, 4.49 MB in all.

The page was rendered by headless Chromium from an SVG page (`setContent`, so no server and no port). Its sources
are in `pictures/16-05-pictures-source.tar.gz`: `export-samples.ts`, `compose-files-inside.js` and `sizes.md`.

## Deviations from Plan

1. **[Rule 2 - Needed for a testable contract] `sliceFileName(stem, index, count)` exported from cnc-files.ts.**
   The plan wanted the past-99 rule proven on "a synthetic slice list". No board has 100 slices, so the naming rule
   is one exported function that `cncFiles` uses and the test calls directly. It's additive.
2. **[Rule 2 - Additive] `stlHeader(stem)` exported from stl.ts, `formatMm`/`CRLF` from xyz.ts, `ZIP_DOS_DATE` from
   zip.ts, and the DXF's flag and header constants from dxf.ts.** These let the tests compare against the writers'
   own values rather than typed numbers. `readStl` also returns each face's `normals`, so a test can check they point
   outward. `readDxf` returns each vertex's flag (`vertexFlags`), so the 32-per-vertex rule is read back, not assumed.
3. **[Rule 2 - Correctness] The STL header keeps ` mm` on a long name.** `Shaper Assistant board {stem} mm` would run
   past 80 bytes for a stem over 54 letters, so the stem is shortened to fit. The header is always printable ASCII,
   padded with spaces.
4. **[Rule 2 - Correctness] `writeZip` refuses more than 65,535 files or 4 GB**, the limits of a zip without its
   64-bit extension. A real board is about 53 files and 6 MB, so this never fires. `readZip` decodes names as strict
   UTF-8 and refuses anything not stored.
5. **The tracer's interactive checkpoint was not taken.** The orchestrator's rulings set one checkpoint, at Task 3.
   The tracer's verify passed end to end before expansion, as the autonomous gate requires.
6. **The checkpoint's "about fifty slice files" holds (49 on the Fish), but only slice 01 is two pieces.** See
   "What changes for the founder". This is how the litres' stations fall on a 2¾" notch, not a fault in the files.

## Known Stubs

None. No button calls `cncZip` yet; that's plan 16-11's work by design, not a stub.

## Threat surface

- **T-16-10 (path traversal) is mitigated.** Every entry is `boardFileStem(name)` plus a fixed suffix, and the stem
  has no `/`, `\`, `:` or control characters and no leading dot. This is tested with `../../etc/passwd`, `a/b`,
  `C:\x`, `.hidden` and `..\..\x`.
- **T-16-11 (STL header) is mitigated.** The header is ASCII only (anything else becomes `?`), never begins with
  `solid` (it begins `Shaper`), and is padded to 80 bytes.
- **T-16-12 (archive size) is accepted** as planned: 4.5–6.1 MB per preset.
- **T-16-SC:** there's no dependency. nothing was installed, and `package.json` is untouched.

No new network, auth or storage surface.

## Self-Check: PASSED

- FOUND: lib/export/zip.ts, stl.ts, dxf.ts, xyz.ts, cnc-files.ts, cnc-files.test.ts, formats.test.ts;
  lib/models/board-file.ts (boardFileStem), board-file.test.ts; pictures/16-05-files-inside.png,
  pictures/16-05-pictures-source.tar.gz
- FOUND commits: b47cf900 (Task 1), 0ba3f9f0 (Task 2), 91f33784 (picture)
- No sample zip or scratch script under the repo or `.planning` (only the archive).

## Founder's look

Presented by the orchestrator at the Wave 3 checkpoint, 2026-11-04, with the picture of what is inside the Fish's zip.
The founder: "16-05 looks good." Merged into `board-3d` as 89c74736. The deviations (the exported test helpers, the
readers' extra fields, the shortened STL header name, the zip writer's limits) were accepted by the orchestrator.
