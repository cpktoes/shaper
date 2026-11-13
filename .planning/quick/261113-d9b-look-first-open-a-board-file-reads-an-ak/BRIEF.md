# Brief — quick 261113-d9b: a first look at opening a .brd file

The founder, 2026-11-13: **"I think we now need to try importing a .brd file into our app."**

The app already WRITES a `.brd` (AkuShaper / Shape3D board file) from the 3D page — `lib/export/brd.ts`,
`brd-scramble.ts`, `brd-preview.ts`, `components/3d/brd-preview-dialog.tsx` (quick 261110-tvk onward, live
2026-11-12). This task is the first step the other way.

## The founder's rulings (asked and answered 2026-11-13 — locked, do not revisit)

- **R1 — Look first, decide later.** His pick, word for word from the card: *"An experiment only: open the file
  in a preview with our closest fit laid over it, nothing saved — to see how close fitting gets before building
  the real import."* So: **no board is opened, nothing is saved, nothing changes in the app's design state.**
  The only way out of the preview is closing it. (He turned down "set the sliders and open it as an editable
  board" and "keep the file's curves exactly, locked" FOR NOW — the look decides which comes next.)
- **R2 — Where:** the existing **Open a board file…** button on the home/setup screen
  (`components/setup/open-board-file.tsx`) also accepts a `.brd`.
- **R3 — How far:** **outline, rocker and thickness only.** Rails and bottom contours (the file's
  cross-sections) are NOT read into anything on this first try; the preview says so in one plain line.

## Why a "fit" at all

Every board in this app is drawn from its own controls, never from free curves:
`OutlineSpec` (`lib/geometry/board.ts` — length, wide point width and offset, nose/tail rail length, nose/tail
angle and fullness, a tail kind), `FiveStationRocker` (`lib/geometry/rocker.ts` — four lifts, centre 0) and
`FoilSpec` (`lib/geometry/foil.ts` — five thicknesses at the same five stations). A `.brd` is free Bézier
curves. So "our closest fit" = the values of those controls whose curves lie closest to the file's curves,
with no blank picked (the hand-set rocker and foil: `buildFallbackProfile` in `lib/geometry/board-profile.ts`).
The whole point of the experiment is the honest answer to **"how far off is the closest our controls can
get?"** — in inches/millimetres, per curve, and where along the board.

## Facts about the files (verified, 2026-11-10 to 11-13)

- 12-byte header `%BRD-1.02s00`, then the text behind a known scramble — `unscrambleBrd` in
  `lib/export/brd-scramble.ts` already opens it. AkuShaper also opens (and leaves behind, as `_decrypt.brd`)
  the SAME text plain, with no header — accept both.
- Text: `pNN : value` one-line fields (p01 length, p03 thickness, p04 width, p07 `V4.4`, `p38 : 5` in every
  sample, all figures centimetres), then `p32 : (` outline, `p33 : (` bottom, `p34 : (` deck, `p35 : (`
  cross-sections (`(p36 <station> -1.0 -1.0 …`). Each curve is a list of
  `(cp [x,y, in-x,in-y, out-x,out-y] <continuous> <other>)` knots. x runs from the TAIL (0) to the nose; the
  outline's y is the half-width.
- `readBrdText` in `lib/export/brd.ts` is a STRICT reader of our own writer's output (it throws on any line it
  does not expect) and the tests rely on that. **AkuShaper's own files differ**: other header fields (p08, p45,
  p10 with a Windows/Mac path, p48, p58 a 70-digit number, p27–p31, p50 bracket lists), `gps : ( (gp [x,y]) … )`
  guide-point lines under a section, the second flag sometimes `true`, numbers like `3.08E-4`, possibly CRLF.
  A separate, forgiving reader is needed for other programs' files; keep `readBrdText` strict.
- AkuShaper's square tail: the outline goes from (0,0) straight up to (0, half-width) at x = 0, then along the
  rail. A `.brd` carries no swallow (fish files are "just a big wide tail").
- Never copy BoardCAD's code (its licence is not stated) — write from the format's facts above.

## Test boards

- Real AkuShaper files on this Mac, **outside the repo**: `~/Downloads/6'10-Widepoint-Fwd-Egg.brd`,
  `~/Downloads/6'2-Round-Tail---Double-Concave.brd`, `~/Downloads/Fryer-5'7-Squash-Flyer-Twin.brd`,
  `~/Downloads/Scoop-Noserider.brd`. **Do NOT commit them or copy their text into the repo** — they are other
  people's boards and carry their names and folder paths in the header. Run the fit against them from a scratch
  script, and put the closeness figures in the SUMMARY.
- In the repo's own tests: (a) **the round trip** — write each preset with the app's own `brdText`, read it
  back, fit it, and expect the preset's own controls back within a tight tolerance (the best proof the fit
  works: the right answer is known); (b) a small hand-made text in AkuShaper's layout (odd header fields, a
  `gps` block, CRLF, a square tail) made from the format facts, not from anyone's board.
- `~/Downloads/mid.brd` and `testLB.brd` are this app's own exports (30 and 35 sections) — also fair game
  locally.

## What I expect the plan to hold (my calls — the founder sees them at his look)

1. **Reading** (`lib/export/`): a forgiving reader for any program's `.brd` (scrambled or plain), bounded and
   safe — the file is untrusted text: cap lines/knots, every number finite, no `eval`, a clear failure rather
   than a throw into the page. Samples the outline (half-width by station), bottom and deck (height by station)
   from the Béziers.
2. **Fitting** (`lib/geometry/`, pure and tested — CLAUDE.md Rule 1): the file's sampled curves → `OutlineSpec`
   + `FiveStationRocker` + `FoilSpec`, each clamped to the ranges the app's own controls allow (the fit must be
   a board the sliders could really make — find those ranges in the code, never restate them), plus a
   **closeness report** per curve: the largest gap, a typical gap, and the station of the largest. Tail kind
   from the file's shape (square end → squash with its end width; pointed → pin/round, whichever fits closer;
   never swallow/diamond). Rocker read the way the app measures rocker (lifts off the centre's low point at the
   app's own five stations), thickness = deck − bottom at those stations. Actual values kept; rounding only
   where a figure is shown (the founder's standing rule).
3. **The preview** — a dialog in the family of the existing Board file preview
   (`components/3d/brd-preview-dialog.tsx`, `lib/export/brd-preview.ts`: nose left, nothing stretched, same
   tokens): top view with the file's outline in solid ink and our fit laid over it in the dashed second line;
   side view the same way (file's bottom + deck, our fit's); a short key; the file's own size line; a
   "how close" block (outline / rocker / thickness, each "within X" in the shaper's own system through
   `lib/geometry/units.ts` / `measure-display.ts` — Rule 2); the fitted control values in a compact list; one
   line that rails and bottom contours are not read yet; **one button: Close**. Wording is ours for his look —
   plain English, a shaper's words ("the file", "our closest fit"), never "import failed"/"parse".
4. **Wiring**: Open a board file… accepts `.brd` beside `.json` (ONLY that button — the account's "Import my
   designs" stays JSON-only, so do not widen the shared `BOARD_FILE_ACCEPT` for it); a `.brd` goes to the
   preview and never to `onOpen`; a `.brd` that can't be read gets the same quiet line under the button the
   JSON problems get. Works signed out. Nothing is sent anywhere; no database change; the Privacy page needs
   no new sentence (the file never leaves the browser).
5. **Proof**: unit tests as above; a browser test (desktop + both phones) that picks a `.brd` made by the app's
   own writer and sees the preview, both lines and the closeness figures, and that the board in progress is
   untouched after Close; **pictures** of the preview for the four AkuShaper files (read from `~/Downloads`
   by a throwaway shoot script, never committed) and one of our own exports, saved under this task's
   `pictures/` for the founder's look — desktop and an upright phone. If the home page's desktop baseline
   picture changes because the helper line under the button changed, read the diff, re-record, commit.

## House rules that bite here

- Work in THIS checkout (`.claude/worktrees/close-bottom-17`, branch `close-bottom-17`, = origin/main
  15beb4c3). **Never `cd` into a subfolder** — `git -C` and absolute paths only. Nothing is pushed; the founder
  says when.
- `PW_PORT=3117` for any Playwright run (3100 may be busy). Do not start `next dev` by hand for the tests.
- `npx tsc --noEmit`, `npm run lint` and the touched unit tests must be clean before each commit; vitest does
  not type-check — route values through `mm()`/`degrees()`.
- Commit messages and the SUMMARY in plain English: what a shaper sees, not which component changed.
- AGENTS.md: this Next.js has breaking changes — read the relevant guide under `node_modules/next/dist/docs/`
  before writing page code.
