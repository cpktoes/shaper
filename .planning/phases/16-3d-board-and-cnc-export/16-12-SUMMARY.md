---
phase: 16-3d-board-and-cnc-export
plan: 12
subsystem: 3D screen (Export for CNC…, the 3D screen's desktop reference picture)
status: complete
tags: [3d, export, cnc, dxf, stl, download, safari, lock, D-14, D-15, D-16, D-23, D-26, D-28]
requires:
  - "16-05: cncZip (lib/export/cnc-files.ts), readZip (lib/export/zip.ts), readStl (lib/export/stl.ts), boardFileStem (lib/models/board-file.ts)"
  - "16-06…16-11: ThreeDScreen's memoised surface and its can't-build state, data-board-state / data-triangles / data-frames, ThreeDControls (HARD EDGE, SHOW, VIEW), THREE_D_COPY's export words"
  - "components/setup/board-file-download.ts: the hidden-link download idiom, synchronous inside the tap"
provides:
  - "components/3d/export-cnc.ts: exportForCnc(surface, boardName) → { fileName, sliceCount } — the zip built and downloaded inside the tap, nothing awaited, the scene never imported"
  - "ThreeDControls props exportState (ExportState: idle | done | failed | cant-build) and onExport; the EXPORT section last on the panel"
  - "e2e/three-d-export.spec.ts cases 1–6 (the note checked in every one); board-lock-screens x-3d; desktop-baseline's sixth picture three-d-desktop.png"
affects: [16-13]
tech-stack:
  added: []
  patterns:
    - "A download built synchronously from data already in memory, inside the click handler, through the board file's Blob → object URL → hidden link → click → remove → revoke-after-60-s idiom (Safari's rule)"
    - "A done line split at a marker the copy function is called with, so the sentence stays in the copy file and only the file's name takes the ink"
    - "A desktop reference picture of a WebGL canvas, unmasked, settled by two animation frames with no new scene frame"
key-files:
  created:
    - components/3d/export-cnc.ts
    - e2e/three-d-export.spec.ts
    - e2e/desktop-baseline.spec.ts-snapshots/three-d-desktop-desktop-darwin.png
    - .planning/phases/16-3d-board-and-cnc-export/pictures/16-12-export.png
    - .planning/phases/16-3d-board-and-cnc-export/pictures/16-12-pictures-source.tar.gz
  modified:
    - components/3d/three-d-controls.tsx
    - components/3d/three-d-screen.tsx
    - e2e/board-lock-screens.spec.ts
    - e2e/desktop-baseline.spec.ts
decisions:
  - "The export is synchronous in the tap with no working state: 52–67 ms per preset on this Mac's desktop browser, so the UI-SPEC's 'Making the files…' line is never shown (the copy keeps the string, unused)"
  - "The export reads the screen's own memoised surface (the one the 3D board is drawn from) and the store's boardName — never the switches — so the files are the bare board by construction (D-16)"
  - "On a locked board the HARD EDGE rows stay greyed (they change the board, D-30), while SHOW, VIEW and Export stay live; the lock test asserts both halves"
  - "The sixth desktop picture is unmasked (D-28): headless Chromium draws the board the same every run"
metrics:
  duration: "about 75 minutes"
  completed: 2026-11-04
estimate:
  tokens: 95000
actuals:
  tokens: 7800
  tasks: 2
  commits: 3
---

# Phase 16 Plan 12: Export for CNC… Summary

One tap on the 3D panel's last button downloads one zip of the board on screen: its DXF, its STL and the text files
(the outline, the profile and one file per slice), in millimetres, named from the board. The download works with
no 3D drawing, on a locked board and signed out, waits with a reason when the board can't be built, and never
includes the fins, the blank or the stripes. The 3D screen also gets its own desktop reference picture.

## What changes for the founder

- **A new EXPORT section at the bottom of the 3D panel**, under VIEW. It holds one filled button, **Export for
  CNC…**, the only filled button on the panel. Under it is the note "Shape3D reads this as a guide and fits its own
  curves to it." Only Shape3D is named (D-23). Under the note is a line that stays empty until you export.
- **One tap, one download.** The zip is named after the board: `Fish 5'10"` downloads as `Fish 5'10-3d.zip`, with
  `Fish 5'10.dxf`, `Fish 5'10.stl`, `Fish 5'10-outline.txt`, `Fish 5'10-profile.txt` and `Fish 5'10-slice-01.txt` to
  `-slice-49.txt` inside. A board with no name downloads as `Untitled Board-3d.zip`. The names follow the same rule
  Save board as file… uses, so the two downloads always name a board the same way.
- **The line under the note says what arrived**, for example "Downloaded Fish 5'10-3d.zip. The outline, the profile
  and 49 slices, in millimetres." The file's name is in full ink, and the slice count comes from the files
  themselves. The line stays until you export again or leave the screen.
- **It's the board you see, and only the board.** The STL holds exactly the triangles the screen draws. Turning Fins
  off, or Blank or Contour Stripes on, doesn't change a single byte of the zip: the files are the bare foam (D-16).
- **It works where the drawing doesn't.** A browser that can't draw in 3D shows its message, and Export still
  downloads the full zip, identical to the one a browser that draws gets.
- **A board that can't be built** (for example, a length outside 60"–120") has nothing to export. The button is
  dimmed and the line reads "There's nothing to export until the board can be drawn."
- **A locked board exports exactly like an unlocked one.** The HARD EDGE rows are greyed because they change the
  board, as they are on RAILS. Everything else on the panel stays live, Export included. Exporting never saves
  anything. Signed in or signed out makes no difference.
- **If something goes wrong** the line reads "Couldn't make the files — try again." in the warning colour, and
  pressing Export again is the retry.
- **On an iPhone** the download starts inside the tap itself, which is what Safari requires. It is proven in the
  iPhone browser the tests use. Your own iPhone check is at the go-live (16-13).

## How long the tap takes, per preset

Measured in this Mac's desktop browser (Chromium, the worktree's development server). The timer runs
`performance.now()` around the tap's own work: making every file and starting the download. The figure is the
median of 7 taps, from a scratch run. The 3D board is already built when the screen opens, so the tap only writes
the files.

| Preset | Download | Size | Slices | Tap (median of 7) | All 7 taps (ms) |
|--------|----------|------|--------|-------------------|-----------------|
| Shortboard | `Untitled Board-3d.zip` | 4.75 MB (4,979,655 B) | 50 | 52 ms | 62 60 54 52 52 51 51 |
| Fish | `Untitled Board-3d.zip` | 4.49 MB (4,705,146 B) | 49 | 60 ms | 69 56 60 49 60 77 179 |
| Mid-length | `Untitled Board-3d.zip` | 5.31 MB (5,563,055 B) | 49 | 60 ms | 74 64 60 59 59 59 60 |
| Longboard | `Untitled Board-3d.zip` | 6.09 MB (6,386,675 B) | 50 | 67 ms | 78 70 65 65 67 68 67 |

The research expected 123–187 ms in Node including the surface. Without the surface, the tap here takes a third to
half of that. A phone is commonly 2–4× slower, which still fits inside one tap. If the founder's iPhone shows the
download lost or slow at 16-13, the research's fallback is ready: use fewer points around each section for the files.
An asynchronous build is not the fallback.

One downloaded Fish zip, named `Fish 5'10"`, is kept for a look at
`/private/tmp/claude-501/-Users-kontoes-Code-shaper/aca08098-d213-4b0a-9c2f-b7dd43fd982d/scratchpad/Fish 5'10-3d.zip`
(4,704,616 bytes). It is outside the repo on purpose.

## The picture

`.planning/phases/16-3d-board-and-cnc-export/pictures/16-12-export.png` contains:

1. On a computer, the whole panel before and after a tap (the done line), and the 1280 × 800 window scrolled to
   EXPORT.
2. On an iPhone 14 (WebKit), the page scrolled to EXPORT before and after a tap. Beside it, a board that can't be
   built (a Fish set to 40"): Export dimmed, with the reason on the line.
3. The time table above.

The sources (`pictures.config.ts`, `shots.spec.ts`, `compose.js`, `out/times.json`) are in
`pictures/16-12-pictures-source.tar.gz`. The shots hide the development server's own "N" badge, which is not part
of the app.

## The sixth desktop reference picture

`e2e/desktop-baseline.spec.ts-snapshots/three-d-desktop-desktop-darwin.png` (SHA-256 fb4d7c90…) shows the default
board lit at its first view, with HARD EDGE, SHOW, VIEW and the top of EXPORT on the panel. The canvas is unmasked
(D-28). Before the shot, the test waits for the scene's `ready` and then for two animation frames with no new scene
frame, so the loading picture can never be in it. The other five pictures were re-run unchanged and are byte for
byte what they were (`git status` showed only the new PNG). The spec's header has a dated ADDED block. The
orchestrator confirms the picture under the main checkout's Turbopack run after the merge.

## Tasks

| Task | Name | Commit | Files |
|------|------|--------|-------|
| 1 | Export for CNC…: one tap, one zip of the drawn board, downloaded inside the tap, with the done line | 4a07e72a | components/3d/export-cnc.ts, three-d-controls.tsx, three-d-screen.tsx, e2e/three-d-export.spec.ts (case 1) |
| 2 | Export with no 3D drawing, dimmed when the board can't be built, the same on a locked board, blind to the switches, and the 3D screen's desktop picture | bd65b890 | e2e/three-d-export.spec.ts (cases 2–6), e2e/board-lock-screens.spec.ts (x-3d), e2e/desktop-baseline.spec.ts + three-d-desktop PNG, pictures/16-12-export.png, pictures/16-12-pictures-source.tar.gz |
| 3 | The founder exports a board before this merges | — | checkpoint:human-verify, pending |

## Verification

- `npx tsc --noEmit`: exit 0. `npm run lint`: 0 errors and 1 warning, which predates this plan and sits in an
  unrelated file (`lib/db/import-designs-action.test.ts:42`, `_calls`).
- `npm test`: 7,435 passed, 2 skipped, 1 timed out: `lib/models/rack-stand-in.test.ts` "every count from 1 to 100",
  a known heavy sweep. It times out under the full run's load and passed alone with `--testTimeout=120000` (34/34),
  twice.
- Task 1 verify: `e2e/three-d-export.spec.ts` case 1 passed on iphone, android and desktop (3/3).
- Task 2 verify, run together on port 3212: `three-d-export`, `board-lock-screens`, `three-d-screen` and
  `three-d-show` on all three projects gave **101 passed, 33 skipped, 1 failed**. The one failure was the existing
  phone walk `p-screens` on iphone (it never visits 3D). It failed on a toHaveCount wait under load and **passed
  alone (1/1)**. The export spec alone: 14 passed and 4 skipped (cases 4 and 6 run on the computer only). `x-3d`:
  3/3.
- Desktop baseline: `--project=desktop`, **6 passed**, with the five old pictures unchanged.
- Acceptance greps: `await|import(` in export-cnc.ts → 0; `cncZip(` → 1; the Shape3D note in three-d-copy.ts → 1;
  AkuShaper outside comments → 0; `board-scene` in export-cnc.ts → 0; `goToScreen(page, "3D")` in
  board-lock-screens.spec.ts → 1; the last commit's snapshot stat lists only the new PNG; no `.zip/.ts/.js/.cjs/.mjs`
  files under `.planning` are left uncommitted.

## Deviations from Plan

1. **[Rule 3, blocking, test only] Case 1 types the board name until it holds.** On the iPhone project, a name
   typed into SUMMARY's Board Name box a moment before React took over the box was wiped, so the export downloaded
   `Untitled Board-3d.zip`. The fill is now retried inside `toPass` until the box keeps the value. This is the same
   hydration race the other specs wait out.
2. **Case 2 compares against a drawn board's bytes, not "case 1's board".** The test downloads the default board in a
   normal page first, then in a page with `getContext` stubbed to null. The two zips must be byte-identical (names
   and slice count included), which is stronger than matching names and counts.
3. **The lock test differs from the plan's words "nothing on the 3D screen is greyed".** D-30, decided after this
   plan was written, put the tail's two HARD EDGE rows on the 3D panel. They change the board, so a locked board
   greys them as it greys RAILS' rows (16-06/16-07's own rule). `x-3d` asserts both halves. No control that changes
   the board is live (`liveBoardControls` → []), and every `data-lock-exempt` control (SHOW, VIEW, Export) is
   enabled. Export downloads the board's zip, only the status line changes, and nothing is saved. The founder may
   overrule.
4. **The test sits in the "still exports and prints" block and runs on all three projects.** The plan said "the
   phone describe and the desktop describe, or one test on all three projects, as the file's structure suits". It
   reaches 3D through `goToScreen(page, "3D")` and uses `test.slow()`.
5. **No new words.** The UI copy already had every string the export needs. `exportWorking` ("Making the files…")
   stays in `THREE_D_COPY`, unused, because the build is synchronous.
6. **A typed cast in export-cnc.ts.** `writeZip` returns a `Uint8Array` typed over `ArrayBufferLike`, which the DOM's
   `BlobPart` type refuses. The bytes are cast to `Uint8Array<ArrayBuffer>`, which is true because `writeZip`
   allocates a plain `ArrayBuffer`. `lib/export/` is untouched.

No `lib/export/` or `lib/geometry/` file changed. STATE.md and ROADMAP.md were not touched.

## Known Stubs

None.

## Threat Flags

None. The download and its names are the plan's own threat register (T-16-25…27). Every name is
`boardFileStem` plus a fixed suffix, checked by cases 1 and 5 and the lock test. The object URL is revoked 60 s
after the click.

## Self-Check: PASSED

- FOUND: components/3d/export-cnc.ts, e2e/three-d-export.spec.ts,
  e2e/desktop-baseline.spec.ts-snapshots/three-d-desktop-desktop-darwin.png, pictures/16-12-export.png,
  pictures/16-12-pictures-source.tar.gz
- FOUND commits: 4a07e72a, bd65b890

## Founder's look

Pending — presented by the orchestrator at the Wave 9 checkpoint.
