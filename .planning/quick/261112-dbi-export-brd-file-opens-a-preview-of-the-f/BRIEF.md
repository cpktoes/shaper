# Brief — quick 261112-dbi: Export .brd File opens a preview of the file before it is saved

Follows the .brd export work on this branch (`close-bottom-17`): quicks 261110-tvk, 261110-veo, 261112-c2d and fast
tasks 202–204. Read `261112-c2d`'s SUMMARY and the header of `lib/export/brd.ts` first.

## The founder's ask (2026-11-12, his words, with a picture of Shape3D's Design view)

"when saving a .brd file, could be show a preview like the top and side view of Shape3D so the user can see the slices
and trust the output?"

His picture (Shape3D X, our own exported Double Concave Exit Shortboard open in it) shows three stacked drawings:
1. **Top view** — the outline, both rails, nose to the right, with a thin line across the board at every slice.
2. **The selected slice** — one cross-section drawn large (half of it, stringer to rail), its points named.
3. **Side view** — the bottom and deck lines along the stringer, with a thin upright line at every slice.

The point is trust: a shaper should see, before the file leaves the app, that the slices are there, where they stand,
and that the contour is in them.

## What to build

**Pressing Export .brd File opens a preview dialog; the file is saved from a Save button inside it.**

1. **The preview is drawn from the file itself.** Build the file exactly as today (`exportBrd`'s bytes — channel-less
   surface and all), then read those bytes back (`unscrambleBrd` → `readBrdText`) and draw what was read: the outline
   knots, the bottom and deck knots, every section's station and knots. Nothing in the preview comes from the screen's
   own board, so the preview cannot disagree with the file. Say so in one short line in the dialog.
2. **Three drawings, stacked, top to bottom** (the order of his picture):
   - **Top view**: the outline mirrored about the stringer, the stringer as a faint line, and a thin line across the
     board at every slice's station, each as wide as the outline there. The selected slice's line is marked.
   - **Slice**: the selected slice's cross-section, the whole of it (mirrored), drawn from its knots as Bézier curves,
     filling the width. Under or beside it, one line: which slice it is and where it stands — e.g.
     `Slice 9 of 22 · 28" from the tail` (the distance in the shaper's own system through `lib/geometry/units.ts`: feet-and-
     inches style the app already uses for stations, or centimetres to one decimal in Metric — a dim).
   - **Side view**: the bottom and deck curves along the stringer with an upright line between them at every slice. If the
     drawing is stretched in height to be readable (a 6'2" board is 30 times longer than it is thick), say by how much
     the way the app's other viewers do; follow ROCKER's own convention.
   - A slice is picked by tapping or clicking its line in the top or side view, and stepped with a ‹ and a › button (and
     the left/right arrow keys). It opens on the slice nearest the wide point.
3. **Under the drawings**: one line of facts read from the file — e.g. `22 slices · none more than 4" apart · 6'2" × 18 3/4"
   × 2 1/4"` (length, width and thickness from the file's own p01/p04/p03, formatted through `units.ts`; a cut board's
   thickness is the stringer's, as AkuShaper reads it) — the swallow and channels notes when they apply (the same two
   lines the page already shows, from `three-d-copy.ts`), then **Save .brd File** and **Cancel**.
4. **Save** downloads the very bytes the preview was drawn from, inside the tap with nothing awaited (Safari), closes
   the dialog, and the page shows today's done line. **Cancel**, Escape and a click outside close it and save nothing.
5. **Layout**: the app's own dialog (`components/ui/dialog.tsx`, Base UI). On a computer a wide dialog (the drawings
   want width). On a phone — the `max-shell` width rule — and on a short screen — the inline `[@media(max-height:500px)]`
   rule — it must still show all three drawings and both buttons reachable (scroll inside the dialog if it must; the
   buttons stay in view). Touch sizes by the `coarse` pointer variant, 44-dot boxes for the ‹ › and the buttons. Never a
   new "phone" variant (CLAUDE.md, the three switches).
6. **Drawing grammar**: the app's own — load `Skill("sketch-findings-shaper")` (the viewers' drafting grammar) and
   follow the palette contract in `app/globals.css` (light and dark; never a hard-coded colour). Look at how
   `components/bottom/bottom-top-view.tsx`, `components/bottom/bottom-section.tsx` and the ROCKER viewer draw a board
   from above, a cross-section and a side view, and match their line weights, inks and labels. Nose to the right if that
   is how the app's own top views point; otherwise the app's way, not Shape3D's.
7. **Words** (mine, in `components/3d/three-d-copy.ts`, for the founder's pen): title **"Board file preview"**; the line
   **"Drawn from the file itself — these are the slices AkuShaper and Shape3D will read."**; drawing labels **TOP VIEW**,
   **SLICE**, **SIDE VIEW** in the app's small-caps label style; buttons **Save .brd File** and **Cancel**. The page's
   button keeps its name, Export .brd File.

## Rules

- Geometry in `lib/`, pure and tested (CLAUDE.md Rule 1): a small module (e.g. `lib/export/brd-preview.ts`) that turns a
  read file into what the dialog draws — the outline as a polyline, the bottom and deck polylines, each slice's station,
  half-width there, bottom and deck heights there, and its cross-section polyline — by sampling the file's Bézier knots
  (`bezierPoint` in `lib/geometry/bezier-fit.ts`). Tests on the flat Shortboard, the Fish and a Deep Single board: slice
  count equals the file's; each slice line's half-width equals the outline's at that station within 0.5 mm; every number
  finite; the Deep Single's middle slice dips at the stringer. No formula in a component; every length shown goes
  through `units.ts` (the file is in centimetres: use the existing helpers, never a bare 10 or 2.54).
- Keep the file's bytes untouched — a test that the bytes saved from the dialog equal `exportBrd`'s for the same board.
- Browser tests: every spec that presses Export and waits for a download now goes through the dialog (press Export →
  the dialog shows → press Save → the download). Update `e2e/three-d-export.spec.ts` (all its cases, including the
  byte-for-byte channel case, the swallow and channels notes — now also checked inside the dialog — and the failure
  case) and `e2e/board-lock-screens.spec.ts`'s 3D case; add checks that the dialog shows as many slice lines as the file
  has sections, that ‹ › and a tap on a line change the slice line, that Cancel saves nothing, and — on the two phone
  projects — that the buttons are at least 44 dots and reachable upright and sideways. Run the export spec on all three
  projects (`PW_PORT=3117`), and `e2e/desktop-baseline.spec.ts -g 3D` (the page with the dialog closed must not change).
- Pictures for the founder's look, saved under this task's folder in `pictures/` (PNG, from a headless Playwright run
  against the dev server on 3117): the dialog on the computer layout in light and in dark with the Deep Single
  Shortboard, on the Fish (swallow note), on an upright phone and on a sideways phone. Look at each picture yourself
  before calling the drawing done; say in the SUMMARY what each shows.
- Work only in `/Users/kontoes/Code/shaper/.claude/worktrees/close-bottom-17` (branch `close-bottom-17`); never `cd`
  elsewhere; no push, no merge. node_modules is a real hardlinked copy. `npx next typegen` before `npx tsc --noEmit`.
  Never the whole Vitest suite in one task; run the touched test files alone. Do not open AkuShaper or Shape3D and do
  not touch `~/Downloads`.
- Plain-English commit messages a shaper can read, each ending with `Co-Authored-By: Claude <noreply@anthropic.com>`.
