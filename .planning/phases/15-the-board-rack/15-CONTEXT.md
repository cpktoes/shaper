# Phase 15: The Board Rack - Context

**Gathered:** 2026-10-05
**Status:** Ready for planning

<domain>
## Phase Boundary

The home page's saved boards become the **Board Rack**: every board stands sideways at one true scale on
one floor line, its name and dims running up beside it. The board you're on turns its real turn to show
its outline: on a computer as the cursor passes, on a touch screen as it passes the middle of a swipe. The
rack keeps the order the shaper sets, stored on their account. This covers computers, phones and iPads.
The presets, the design screens and printing are untouched. It must be live before the Wednesday
2026-10-07 freeze.

</domain>

<spec_lock>
## Requirements (locked via SPEC.md)

**10 requirements are locked** (the founder locked the brief on 2026-10-05). See `15-SPEC.md` for full
requirements, boundaries, constraints and acceptance criteria.

Downstream agents MUST read `15-SPEC.md` before planning or implementing. Requirements are not duplicated here.

**In scope (from SPEC.md):** the home page's saved-boards section (heading, the rack on computers and touch
devices, the caption, opening a board, Rename/Duplicate/Delete, moving boards, the stored order); the turn
maths; the database change for the order.
**Out of scope (from SPEC.md):** the Shape a New Board presets (unchanged), the five design screens,
printing, sharing, any new screen. Signed-out visitors keep today's behaviour (no rack until a board is in
progress).

</spec_lock>

<decisions>
## Implementation Decisions

### Where boards land in the shaper's order
- **D-01:** **A newly saved board goes first**, right where the unsaved board stood. Saving it doesn't
  move it, and new boards are where a shaper looks for them, as today.
- **D-02:** **A duplicate goes right after its original**, so the two stand side by side to compare.
- **D-03:** **The rack keeps today's automatic order until the shaper first moves a board.** Until then it
  is "unsaved first, then most recently touched", with editing bringing a board to the front as today
  (`lib/models/rack-order.ts`). The first move fixes the order, and from then on editing never moves a
  board; only moving it does. New boards (D-01) and duplicates (D-02) are added into the fixed order. A
  deleted board simply leaves it. — **Reversibility:** one-way — the order is stored on the account (see
  Claude's Discretion), so removing it later needs a removal migration (deploy first, then migrate, per the
  Database rule).

### Which rack each device gets
- **D-04:** **Mouse versus finger decides, not width.** A mouse or trackpad gets the **hover rack** (the
  turn follows the cursor, press and drag to move, ⋯ → Move left / Move right, Alt + arrow). A finger gets
  the **swipe rack** (each board turns as it passes the middle, hold then slide to move). So an iPad swipes
  at any width, and a computer hovers even in a narrow window (below the 820-dot layout switch the hover
  rack simply holds fewer boards per row). This is a new job for the **pointer** switch, which until now
  only decided how big controls draw (and whether the Rotate button shows), so the CLAUDE.md Layout section
  needs one sentence about it. Width still picks the page layout, and height still picks short-screen
  behaviour.
- **D-05:** **On the hover rack, a finger tap turns first and opens second.** On a touch-screen laptop (or
  any finger tap on the hover rack), the first tap turns the board and shows its caption; a second tap, or
  Open This Board, opens it. A mouse click opens straight away.
- **D-06:** **A phone held sideways gives the rack the screen.** On a short screen the rack takes most of
  the screen's height so boards and their words stay readable, and Shape a New Board is a scroll below.
  (On an upright phone, Shape a New Board stays on the first screen, per the brief.)

### First look and words
- **D-07:** **The board you're working on is turned when the home page opens.** That's the board open in
  the editor, saved or not, and on the swipe rack it's scrolled to the middle, so coming back home shows
  where you were. With nothing open, the first board in the rack.
- **D-08:** **The hint always shows**, in muted ink beside the count: "15 boards · point to turn, drag to
  move" on the hover rack and "15 boards · hold to move" on the swipe rack.
- **D-09:** **The same rack whatever the count.** One board stands turned with its caption under it. There
  is no separate look for one or two boards, which is most new shapers on Saturday.

### Going live and backups
- **D-10:** **One go-live** (the founder chose this over the recommended two). The database change goes to
  the live site first; it changes nothing anyone sees, and nothing reads it until the code ships (Database
  rule: additive change, production before the code). Then the whole rack goes in one push on the founder's
  go: the look, the turn, both racks and moving boards. It's all or nothing by Wednesday 2026-10-07 evening.
- **D-11:** **The fallback, only if hold-and-drag isn't reliable on the founder's iPad by Wednesday:** the
  swipe rack still goes live, and on phones and iPads a board is moved with ⋯ → Move left / Move right until
  hold-and-drag is fixed after the showing. The plan should make this a small, prepared switch, not a
  rebuild.
- **D-12:** **No move buttons on phones and iPads otherwise.** ⋯ keeps Move left / Move right on the hover
  rack only; the swipe rack's ⋯ is Rename, Duplicate and Delete, as today. Consequence, accepted by the
  founder: someone using a screen reader on a phone can browse and open boards but can't move them. This
  narrows the brief's constraint 8 for touch screens; computers keep the keyboard way (Alt + arrow) and ⋯.

### Carried forward from Phase 14 (the same go-live pattern)
- **D-13:** **A read-only report on the real saved boards before the push** (14 D-18). The founder runs
  one command in their own terminal, as with earlier production steps, and it only reads. For every saved
  board it checks that the rack can draw it (side profile and outline build), and it prints counts per
  account and any board the rack would drop, by id only.
- **D-14:** **One rehearsal walk after the go-live** (14 D-17). Phase 13's real-device walk runs on the
  site as the shapers will see it, Board Rack included, before the freeze. Its walk sheet gains the rack.
- **D-15:** **Nothing announces the change** (14 D-19). No "what's new" notice. The rack and its hint (D-8)
  speak for themselves.

### Claude's Discretion
- **Where the order is stored:** one ordered list of the shaper's board ids on their account (for
  example a nullable column on `user_preferences`, null until the first move, which is D-03's "automatic
  until you arrange"), or a position on each board. Research decides; the account list is the leading
  candidate because D-03's "not arranged yet" state falls out of null. Either way the order follows the
  shaper to every device (the brief's acceptance criteria). Two devices moving boards at once: last write
  wins, without corrupting the list (a board missing from the list goes per D-01; an id with no board is
  skipped).
- **The exact timings and sizes** (hold about 420 ms, swell from about 120 ms, 6-dot drag threshold, 46-dot
  edge zone, about 180 ms rest before a board finishes turning, 48-dot slots on a computer and 40 on a phone,
  rack heights) start from the sketches' figures in `references/board-rack.md` and may be tuned on real
  devices.
- **How the turn maths is split** into pure, tested functions under `lib/geometry/` (Rule 1): at least the
  projected silhouette at an angle, the stringer, the half-extent, and the room the rack makes around
  turning boards.
- **Reduced motion:** turn and drop without the glide (the brief's constraint 8).

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### The brief and the design
- `.planning/phases/15-the-board-rack/15-SPEC.md` — Locked requirements: MUST read before planning
- `.claude/skills/sketch-findings-shaper/references/board-rack.md` — The turn maths (the formula to port),
  the layout figures, the interaction timings, what was rejected and why, measured before/after numbers
- `.claude/skills/sketch-findings-shaper/SKILL.md` — The overall visual direction (drafting style, the
  app's own palette, older-Safari rule)
- `.claude/skills/sketch-findings-shaper/references/drawing-and-callouts.md` — Dash patterns (stringer
  `16 4 4 4`), nothing but faint lines inside a board, labels as SVG text
- `.planning/sketches/009-phone-swipe-rack/` — The swipe rack (winner B): README, working `index.html`,
  `sketch-source.tar.gz`
- `.planning/sketches/010-sideways-board-rack/` — The hover rack (winner A, the turn follows the cursor) with
  drag-to-move: README, `index.html`, `pictures/`
- `.planning/sketches/011-phone-rack-reorder/` — Hold and drag on a phone (winner A): README,
  `index.html`, `pictures/`, and the published copy the founder tried on a phone
  (https://claude.ai/artifact/V2g7Lw6wSvq5jfUABWfEaY)
- `.planning/sketches/MANIFEST.md` — Decisions 11–14 (the Board Rack) and 1–8 (the drawing grammar)

### Project rules this phase must keep
- `CLAUDE.md` — Rule 1 (geometry pure and tested in `lib/geometry/`), Rule 2 (units through
  `lib/geometry/units.ts`), the Database section (additive migration to production BEFORE the code
  ships), the Layout section (width = layout, pointer = sizing, height = short screen; D-04 adds a pointer
  job)
- `app/globals.css` — The `--surf-*` theme contract, and the base-layer fix for buttons on Safari before
  18.4 (around line 811: older Safari aligns button content to the start)

### Go-live and the showing
- `.planning/phases/14-realistic-surfboard-flow/14-CONTEXT.md` — D-17 (one rehearsal walk after the last
  change), D-18 (read-only report on the real saved boards), D-19 (nothing announced): carried as D-13 to
  D-15
- `.planning/phases/13-ready-for-the-shapers/13-UAT.md` — The rehearsal checks and the Wednesday freeze
- `.planning/phases/13-ready-for-the-shapers/13-walk-sheet.pdf` — The printed walk sheet the rack must
  join (D-14)

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- `lib/geometry/design.ts` `summarizeDesign` / `summarizeDesignWith`: builds a board's side profile
  exactly as the store does (from the board's own copy of its blank) and its card numbers. The rack
  needs the same `buildBoardProfile` input for each saved board.
- `lib/geometry/board-profile.ts` `BoardSideProfile` (`rockerAt`, `deckAt`, `thicknessAt`) and
  `lib/geometry/outline.ts` (`buildOutline`, `sampleOutline`, `geometry.points`,
  `centreCloseStation`): everything the turn maths reads.
- `lib/geometry/screen-tiles.ts`: already turns a side profile and an outline into label-free SVG paths
  in the board's own millimetres (`rockerTileArt`, `outlineTileArt`, `sidePoints`, `silhouette`). It's the
  closest pattern for the rack's art, and is pure and tested.
- `lib/geometry/summary-line.ts` `formatSummaryLine`: the card line in Imperial or Metric (the vertical
  words and the caption).
- `components/setup/rack-card-menu.tsx`, `rename-dialog.tsx`, `delete-confirm-dialog.tsx`, and
  `board-rack.tsx`'s lifted dialog state with per-card duplicate errors: Rename/Duplicate/Delete keep
  working from the caption's ⋯.
- `components/setup/card-metadata-line.tsx` and the card text styles in `board-rack-card.tsx` (name 20px
  semibold, card line 12px semibold muted, CTA tracked uppercase in accent ink): the caption reuses them.
- `lib/models/rack-models.ts` `rackModelsFromRows`: drops a board whose numbers can't be worked out
  (WR-05). The rack must keep that.

### Established Patterns
- **The order rule lives in a pure module** (`lib/models/rack-order.ts` `sortRackEntries`) that the setup
  screen calls before rendering. The stored order (D-03) extends this module; components only render.
- **Home page data:** `app/page.tsx`'s `BoardRackData` server component reads the signed-in shaper's rows
  inside Suspense (a slow read shows the presets alone, with no spinner). The stored order is read there too.
- **Saved-board actions** in `app/design/actions.ts` (`saveModel`, `renameModel`, `duplicateModel`,
  `deleteModel`) are where D-01 and D-02 hook in, and where a "move" action would sit.
- **Account settings** live in `user_preferences` (one row per Clerk user, nullable columns). Drizzle
  names every column on insert, which is why additive columns go to production first (CLAUDE.md).
- **The pointer variant** `coarse:` (Tailwind custom variant) is today's way to read the pointer.
- **The design store** (`components/design/design-store.tsx`) knows the open board: `modelId` (a saved
  row) and `boardStarted` / `hasBoardInProgress` (the unsaved board). That's what D-07 reads.

### Integration Points
- `components/setup/setup-screen.tsx`: renders `BoardRack` above the presets. The heading, rack and
  caption replace the card grid there.
- `components/setup/board-rack.tsx` / `board-rack-card.tsx` / `card-thumbnail.tsx`: today's grid, to be
  replaced by the rack (the preset cards keep `card-thumbnail.tsx`).
- `lib/db/schema.ts` plus a new Drizzle migration for the stored order (D-03), applied to the development
  branch during the work and to production before the push (D-10).
- Browser tests that walk the home page and will need updating: `e2e/phone-home.spec.ts`,
  `e2e/phone-setup-landscape.spec.ts`, `e2e/phone-trip.spec.ts`, `e2e/error-pages.spec.ts`; and the
  desktop baselines under `e2e/*-snapshots/` (local, macOS-rendered).

</code_context>

<specifics>
## Specific Ideas

- The founder's picture of it: a surf shop's board rack, with boards on edge, rail facing you.
- "Fun to browse" is one of the three wins the founder asked for (with seeing the whole quiver and comparing
  rockers), partly as showroom fun for the 2026-10-10 room.
- Hold-and-drag was chosen after the founder tried it on their own phone, from the published copy of
  sketch 011.
- Words on screen (from the sketches, kept): heading "Board Rack"; hints "point to turn, drag to move" and
  "hold to move"; "IN PROGRESS — NOT SAVED" / "Continue This Board" for the unsaved board; "Moved {name}.
  The rack keeps your order." after a move; "The unsaved board stays first until it's saved" when someone
  tries to move it.

</specifics>

<deferred>
## Deferred Ideas

- **Moving boards with a screen reader on a phone** — not in this phase (D-12). A later accessibility pass
  could add it without visible buttons.
- **Making hold-and-drag reliable on older Safari** — only if D-11's fallback is taken; then it's the
  first fix after the showing.

### Reviewed Todos (not folded)
The keyword matcher returned 13 pending todos; none is about the rack (they share words like "own",
"show" or "phase"): live pointer coordinates on Template/Rocker; the blank's catalog page link; a custom
rocker saved as the shaper's own blank; spoken names for sliders; a miniature blank outline on ROCKER;
retiring today's curve and the 12" blend after the showing; finished-board photo uploads; bottom
contours; branding the order form; a thin board's tip below its centre; the Arctic tape-check; holding
the ghost still; fixing catalogue dims. All stay in `.planning/todos/pending/`.

</deferred>

---

*Phase: 15-the-board-rack*
*Context gathered: 2026-10-05*
