---
phase: close-bottom-17 (quick 261113-d9b .. 261113-vya, go-live review)
reviewed: 2026-11-14T00:00:00Z
depth: deep
files_reviewed: 52
files_reviewed_list:
  - app/api/blank-catalog/route.ts
  - lib/db/blanks.ts (read for the route, unchanged)
  - lib/export/brd-read.ts
  - lib/export/brd-fin-line.ts
  - lib/export/brd-look.ts
  - lib/export/brd-preview.ts
  - lib/export/brd.ts
  - lib/export/brd-fit-preview.ts
  - lib/export/brd-blank-words.ts
  - lib/geometry/brd-fit.ts
  - lib/geometry/brd-fins.ts
  - lib/geometry/brd-wings.ts
  - lib/geometry/brd-bottom.ts
  - lib/geometry/brd-rails.ts
  - lib/geometry/brd-blank-suggest.ts
  - lib/geometry/fins.ts
  - lib/geometry/rail-bands.ts
  - lib/geometry/volume.ts
  - lib/geometry/board.ts
  - lib/geometry/board-size.ts
  - lib/geometry/outline.ts
  - lib/geometry/outline-drag.ts
  - lib/geometry/template.ts
  - lib/geometry/measure-display.ts
  - lib/geometry/units.ts
  - lib/geometry/bottom.ts
  - lib/geometry/blank-reasons.ts
  - lib/geometry/guide-outline.ts
  - lib/geometry/guide-rails.ts
  - lib/geometry/guide-fins.ts (read, unchanged)
  - lib/geometry/custom-rocker.ts (read, unchanged)
  - lib/models/brd-board.ts
  - lib/models/design-snapshot.ts
  - lib/models/tail-blend-report.ts
  - scripts/check-saved-boards.ts
  - components/setup/open-board-file.tsx
  - components/setup/brd-look.worker.ts
  - components/setup/brd-fit-dialog.tsx
  - components/setup/brd-blank-suggestions.tsx
  - components/setup/setup-screen.tsx (read, unchanged)
  - components/3d/three-d-screen.tsx
  - components/3d/export-cnc.ts
  - components/3d/brd-preview-dialog.tsx
  - components/3d/three-d-copy.ts
  - components/design/design-store.tsx
  - components/fins/fin-controls.tsx
  - components/outline/outline-controls.tsx
  - components/outline/outline-viewer.tsx
  - components/viewer/callout-primitives.tsx
  - components/rocker/rocker-view-frame.ts
  - components/summary/bottom-sheet-fit.ts
  - components/summary/order-form.tsx
findings:
  critical: 0
  warning: 4
  info: 6
  total: 10
status: issues_found
---

# Code Review Report — branch close-bottom-17 (HEAD c851105f) against the live site (origin/main 15beb4c3)

**Reviewed:** 2026-11-14
**Depth:** deep (call chains traced from the reader to the fit, the dialog, the worker, the PDF and the saved board)
**Status:** issues_found — no blockers

## Summary

I found nothing that should hold the go-live. No saved board inside the old sizes computes, draws, saves or prints
differently because of a bug. Three things back that up. `holdOutlineToLength` hands back the very same object for every
board of 5'0" or longer and 25" wide or narrower. The new position hold (`heldFinPositionOffset` /
`holdPositionInches`) passes any offset inside ±1 1/2" through unchanged, which every slider-made value is. And the tail
rail fields that a board doesn't have are still never written when it saves. The one deliberate change to existing
boards is the new Tail Rail Blends From / Ends At default: every saved board that never moved those two sliders now
reads 12" and the board's centre, so its litres, its 3D board and its .brd file all move. That is the founder's ruling
(261113-psx SUMMARY, item 1), not a defect. But the read-only production report that lists those boards has not been
run yet (IN-02).

The worker is created only inside a file-pick handler, so it can never run on the server. If the worker can't be
created, or fails, the same work runs on the page instead.

The `.brd` reader is well bounded:
- a 2 MB cap
- at most 50,000 lines
- at most 200 knots a curve
- at most 64 sections
- every knot figure finite and within 10,000 cm
- the header kept in a `Map`, so a file cannot pollute an object prototype
- only linear regexes

The only text from inside the file that ever reaches the page or the PDF is the p51 fin-system word, which is limited
to 32 plain ASCII characters. The fin-line parser is strict: nine finite figures, then the on-board rules.

The fin export checks out: centimetres, measured from the tail end, off the stringer, trailing edge in slots 0-1 and
leading edge in 2-3. The reader and the fit use the same conventions, so a board exported and read back round-trips.

What remains are four robustness and quality warnings:
- the public catalogue route has no caching
- a one-line guide-point block inside a cross-section silently drops sections
- a crafted file costs about 20 s of fitting, which the on-page fallback would spend on the main thread
- the home page now ships the whole fitting library to every visitor

Scratch probes (outside the repo) that confirmed the findings:
`/private/tmp/claude-501/-Users-kontoes-Code-shaper/4bd02881-795f-4931-8d36-b0c262541886/scratchpad/review/probe1.ts`,
`probe2.ts` and `probe3.ts` in the same folder.

## Narrative Findings (AI reviewer)

## Warnings

### WR-01: The public `/api/blank-catalog` route reads the whole catalogue from the database on every request, with no caching — CONFIRMED

**File:** `app/api/blank-catalog/route.ts:14-16` (with `lib/db/blanks.ts:171-194`, `readBlankRows`)
**Issue:** What the route exposes is fine:
- it answers GET only (Next answers 405 to any other method)
- it reads nothing from the request
- it selects only the `blanks` table's catalogue columns: no id, no timestamps, and nothing from `user_blanks`, `models` or `user_preferences`
- a failure is logged on the server and answered `{status:"unavailable"}`, so the error text never reaches the caller

The problem is cost. Next 16 doesn't cache Route Handlers by default (`node_modules/next/dist/docs/01-app/01-getting-started/15-route-handlers.md:51`),
and `cacheComponents` is off in `next.config.ts`. So every GET is a full `SELECT … FROM blanks` of a few hundred rows
with their jsonb station lists, run against Neon, plus a JSON body of tens of KB. The ROCKER page does the same read,
but that costs a whole page render. Here it costs one bare GET, which a script can repeat thousands of times a minute
without signing in.
**Failure scenario:** `while true; do curl -s https://www.shaperassistant.com/api/blank-catalog >/dev/null & done`
keeps Neon's compute busy and runs up Vercel function time for nothing.
**Fix:** let Vercel's CDN answer repeats. Cache only a good answer, and never cache the "unavailable" one:
```ts
export async function GET(): Promise<Response> {
  const result = await loadPickableBlanks();
  return Response.json(result, {
    headers: {
      "Cache-Control":
        result.status === "ok" ? "public, s-maxage=3600, stale-while-revalidate=86400" : "no-store",
    },
  });
}
```
(A re-seeded catalogue then shows here within an hour. `lib/blank-catalog-route.test.ts` keeps passing.)

### WR-02: A one-line `gps : ( … )` guide-point block inside a cross-section drops that section and the next one, silently — CONFIRMED (whether AkuShaper writes one: PLAUSIBLE)

**File:** `lib/export/brd-read.ts:176-179`
**Issue:** The curve branch (lines 210-213) knows a guide-point block can open and close on one line
(`skipping = !(line.length > "gps : (".length && line.endsWith(")"))`). The section branch doesn't: it always sets
`skipping = true`, so the block "continues" until the next lone `)`. That `)` is the section's own closing bracket, so the
section never closes. When the next `(p36 …` opens, it marks the still-open section `bad`, and the outer `)` of `p35`
then closes the wrong section. The board still reads, but with fewer sections. Nothing tells the shaper. The bottom and
rail fits then work from fewer sections, and the preview and printed overview show fewer sections than the file has.
**Failure scenario (probe2.ts):** three sections at 30, 90 and 150 cm, each carrying `gps : ( (gp [1.0,2.0]) )`, read
back as one section (`['1500']`). The same file with the block over three lines reads all three (`['300','900','1500']`).
**Fix:** use the same one-line test in both places (better, one helper for both):
```ts
const opensGuideBlock = (line: string) => line.startsWith("gps : (");
const guideBlockEndsOnSameLine = (line: string) => line.length > "gps : (".length && line.endsWith(")");
// section branch:
if (opensGuideBlock(line)) { skipping = !guideBlockEndsOnSameLine(line); continue; }
```
A related, smaller gap: a block that opens with its first point on the same line and goes on below
(`gps : ( (gp [1,2])` then more `(gp …)` lines) passes the one-line test in the curve branch, too. Its following
`(gp …)` lines are then read as knots, and the whole file reads as "unreadable". Balancing brackets on the line
(`count("(") === count(")")`) is a sturdier test than `endsWith(")")`.

### WR-03: A crafted `.brd` costs about 20 s of fitting with no time limit, and if the worker can't run, that time is spent on the page's main thread — CONFIRMED (measured)

**File:** `components/setup/open-board-file.tsx:120-125, 145-149, 181`; `lib/export/brd-look.ts:28-38`; caps in `lib/export/brd-read.ts:43-50`
**Issue:** Every loop in the fit has a fixed limit (Nelder-Mead 150, golden section 30, the wing rounds, the rail move
rounds, and a parsimony loop that only ever moves settings back toward a new board's). So nothing can hang forever. But
the caps let a file push the work far past a real board.
**Failure scenario (probe1.ts, this Mac, no other load):**

| File | Fit time |
|---|---|
| Ordinary hand-made file | 455 ms |
| 200-knot zig-zag outline | 4.9 s |
| 64 sections × 200 knots | 8.4 s |
| All three, plus a wild p50 | 17.3 s |
| The same at 12'0" | 20.8 s |

With the worker this only leaves "Reading the file…" up for about 20 s, and picking another file cancels it (`dropReading` → `terminate`).
But when `new Worker` throws, or the worker fires `onerror` (a script that fails to load in some browser, or the worker
running out of memory), `lookOnPage` runs the same 20 s on the main thread. The tab freezes, a phone may offer to kill
it, and nothing lets the shaper cancel. No browser test runs the worker against a production build, either: e2e/prod/ has no `.brd` spec.
**Fix (smallest):**
1. Tighten the caps that drive the cost to what real files need: AkuShaper's carry 4-7 sections and this app's 20-35,
   so `BRD_READ_MAX_SECTIONS = 40` is plenty. The section knot cap could drop to about 64.
2. Don't run the heavy fallback on the page for a file that is plainly not an ordinary board, or give it a time budget.
   For example, fall back on the page only when `rawSections.length <= 12`; otherwise answer `unreadable` with "couldn't be read here".
3. Optionally add a `worker.onmessageerror` handler that falls back the same way. Today a result that can't be cloned
   leaves the page waiting with no answer.

### WR-04: The home page now ships the whole `.brd` fitting library to every visitor — CONFIRMED (by import graph; size not measured, a build is running)

**File:** `components/setup/open-board-file.tsx:38-42` (rendered by `components/setup/setup-screen.tsx:6,174`)
**Issue:** `OpenBoardFile` is on the home page, and it now imports these statically:
- `brdLookFromBytes`, which pulls in `brd-fit-preview` (1,484 lines), `brd-fit` (1,029), `brd-bottom` (841), `brd-rails` (803), `brd-fins`, `brd-wings`, `brd-read`, `brd-scramble` and `brd-board`
- `BrdFitDialog`, which pulls in `brd-blank-suggestions` → `brd-blank-suggest`, plus `components/3d/brd-preview-dialog` (for one class-name constant) and everything that file imports

So every visitor, on any phone, downloads and parses all of it before the page is interactive, whether or not they ever
pick a file. That runs against the project's own rule for this feature: `app/api/blank-catalog/route.ts:6-7` says "the
home page … must not get heavier for everybody", and the PDF builder is already loaded on demand
(`brd-fit-dialog.tsx:115`) for exactly that reason.
**Fix:** load both on demand:
```ts
// fallback in open-board-file.tsx
const { brdLookFromBytes } = await import("@/lib/export/brd-look");
// dialog
const BrdFitDialog = dynamic(() => import("@/components/setup/brd-fit-dialog").then((m) => m.BrdFitDialog), { ssr: false });
```
Then move `CAPTION_CLASS` (and the other three class strings now exported from `brd-preview-dialog.tsx`) into a small
shared module, so the home page no longer reaches into the 3D page's dialog. `brdLengthWords` (used only for the
out-of-range message) can move to a small words module too.

## Info

### IN-01: The header's length, width and thickness aren't bounded like knot figures, so a crafted file prints "Infinity NaN/16"" — CONFIRMED

**File:** `lib/export/brd-read.ts:127-131, 245-256, 279-288`
**Issue:** `headerNumber` accepts any finite number, and `centimetresToMm(1e308)` is `Infinity`. The results:
- `p01 : 1e308` is answered `out-of-range` with `length: Infinity`. The message under the button then reads
  "That board is Infinity'NaN/16" long…" (probe1.ts).
- `p04 : 1e308` gives `width: Infinity`. The preview and the printed overview then read
  "The file: 6'0 1/16" × Infinity NaN/16" × 2 1/2"" (probe3.ts).

It's harmless (just a number), but it is nonsense on screen and on paper.
**Fix:** hold the header figures to the same limit as the knots. In `headerNumber`, return
`Number.isFinite(n) && Math.abs(n) <= BRD_READ_MAX_CM ? n : null`. A huge p01 is then `unreadable`, and a huge p04 or
p03 falls back to the outline's own width and thickness.

### IN-02: The new tail-rail default moves the litres of every saved board that never touched those two sliders; the production report hasn't been run

**File:** `lib/geometry/rail-bands.ts:359-391`; `scripts/check-saved-boards.ts` (`--tail-blend-report`)
**Issue:** This is intended (the founder's ruling, 261113-psx SUMMARY item 1), and nothing is rewritten on save. But the
SUMMARY says the report was "built and tested on the 102 stand-ins, **not run against any database**". The preset
litres move too. For example, the Longboard goes 73.61 → 73.57 L (`phase14-preset-figures.json`).
**Fix:** run the founder's production command from the script header (`--tail-blend-report`) before the push, and let
him see the list.

### IN-03: The Tail Block range is still two literals

**File:** `lib/geometry/outline-drag.ts:97` (`tailBlockIn: { min: 0, max: 16, step: 0.125 }`), against `components/outline/outline-controls.tsx:373` (`{ min: 0, max: 16 }`, `0.125`)
**Issue:** This branch moved the FINS and BOTTOM slider ranges into `lib/` so the `.brd` fit and the sliders "can never
drift". The fit's tail-block limit (`brd-fit.ts:463`) still copies the slider's literal by hand.
**Fix:** have `outline-controls.tsx` read `OUTLINE_SLIDER_LIMITS.tailBlockIn`.

### IN-04: The board rack and the design screens can show different widths for a JSON board file carrying a wide-for-its-length board

**File:** `components/design/design-store.tsx:1199-1201` (the only caller of `holdOutlineToLength`)
**Issue:** The hold runs only inside the design store. A board file (or crafted snapshot) holding a 7'0" × 28" outline
draws at 28" on the home page's Board Rack (built straight from the snapshot). It opens at 25" on every design screen,
and is saved at 25". No board saved by the app can get into that state (saves write the held outline), so this is about
foreign files only.
**Fix:** apply `holdOutlineToLength` where the rack and any other snapshot-only drawing build their outline, or in
`readBoardEntry` for files.

### IN-05: A timing assertion in a unit test

**File:** `lib/geometry/brd-fit.test.ts:780-787` (`expect(trip.ms).toBeLessThan(1500)`, with a `console.log` of the timings)
**Issue:** A wall-clock limit inside the vitest suite will fail under the go-live gate's load (the SUMMARYs already
record load-only timeouts), and the `console.log` adds noise to every run.
**Fix:** move the timing check to a benchmark (or `it.skipIf(process.env.CI)`), and drop the `console.log` or put it
behind an env flag.

### IN-06: The worker fallback can leave the page waiting if a message can't be read

**File:** `components/setup/open-board-file.tsx:140-149`
**Issue:** `onmessage` and `onerror` are handled, but `onmessageerror` is not. If a reply ever fails to deserialize,
"Reading the file…" stays up with no answer and no fallback. The result is plain data today, so this is very unlikely.
**Fix:** `worker.onmessageerror = () => { release(); void lookOnPage(id, fileName, bytes); };` (see WR-03 about the cost of that fallback).

## What I checked and found sound (so the next reviewer needn't repeat it)

- **Old boards, sizes.** `holdOutlineToLength` returns the same object for widths of 25" or less and lengths of 4'8" or
  more. The offset window is the full ±12" from 56", so it is untouched on every board of 5'0" or longer.
  `resolveScale`, `fixedFrameScale` and the ROCKER card-spacing hold all leave boards of 10'0" or less unchanged. One
  exception: a board laid on a blank so long that the whole drawing spans more than 10'0" now gets smaller station
  cards, which is the intended fix for cards that overlapped.
- **Old boards, fins.** `holdPositionInches` passes an offset inside its range through bit for bit. The only setup with
  a new range is a Twin's forward pair on Modern/Upright or Keel. Toe, base and off-rail ranges are the same values,
  just moved.
- **Saves.** Absent tail-blend keys stay absent. `resetRailAdvanced` still deletes them. The snapshot's Ends At limit
  rose from 60" to 72" with the longest board. The snapshot length limits are 30" to 288", and zod 4 rejects NaN and Infinity.
- **SSR.** The worker is created only in an event handler, and the catalogue fetch only in `useEffect`. The dialogs
  draw nothing until measured.
- **Untrusted text.** The only file text that reaches the page or the PDF is `brdFinWord` (1-32 chars of
  `[A-Za-z0-9 +-().\/'&]`, with at least one letter). React renders it as text. File names come from the shaper's own
  picker.
- **Fin export and import.** `brdFinFields` and `brdFinsFromLine` / `finMarksOfFile` agree on every convention:
  - centimetres, through `units.ts`
  - x from the tail end, and a swallow is written square at its points, where FINS also measures from
  - y off the stringer, mirrored
  - slots 0-1 are the trailing edge and 2-3 the leading edge
  - toe = back y − front y, base = front x − back x, in from the rail = half-width at the back x − back y
  - a quad writes none, and the 3D page's `quadNote` matches
  - with no fins, the header is exactly the old one
- **Loop limits.** Everything in the fit is limited by constants or by the board's length, never by a count from the
  file: Nelder-Mead, golden section, wing rounds, rail move rounds, the parsimony loop (it only moves settings back
  toward defaults), the blank-suggest bend search (`floorOf` is clamped to ±2", so `k` is limited), and the bottom blends
  (limited by length / 6").
- **Catalogue client.** `prepareAnswer` re-checks every record with `isWellFormedBlankRecord` and `isPickable` before use.

---

_Reviewed: 2026-11-14_
_Reviewer: Claude (gsd-code-reviewer)_
_Depth: deep_
