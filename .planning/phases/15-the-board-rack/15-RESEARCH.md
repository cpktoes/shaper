# Phase 15: The Board Rack - Research

**Researched:** 2026-10-05
**Domain:** Next.js 16 / React 19 home-page rebuild: pure turn maths in `lib/geometry/`, an account-level stored order (Drizzle + Neon), hover and swipe racks with drag / hold-and-drag reordering, older-Safari gestures.
**Confidence:** HIGH on the data, schema, order and maths questions (all read from this repo this session); MEDIUM on iOS gesture behaviour (web-cited, never run on a real iPad/iPhone; the sketches were only tested with a mouse in headless Chromium).

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions

**Where boards land in the shaper's order**
- **D-01:** **A newly saved board goes first**, right where the unsaved board stood. Saving it doesn't move it, and new boards are where a shaper looks for them, as today.
- **D-02:** **A duplicate goes right after its original**, so the two stand side by side to compare.
- **D-03:** **The rack keeps today's automatic order until the shaper first moves a board.** Until then it is "unsaved first, then most recently touched", with editing bringing a board to the front as today (`lib/models/rack-order.ts`). The first move fixes the order, and from then on editing never moves a board; only moving it does. New boards (D-01) and duplicates (D-02) are added into the fixed order. A deleted board simply leaves it. — **Reversibility:** one-way — the order is stored on the account (see Claude's Discretion), so removing it later needs a removal migration (deploy first, then migrate, per the Database rule).

**Which rack each device gets**
- **D-04:** **Mouse versus finger decides, not width.** A mouse or trackpad gets the **hover rack** (the turn follows the cursor, press and drag to move, ⋯ → Move left / Move right, Alt + arrow). A finger gets the **swipe rack** (each board turns as it passes the middle, hold then slide to move). So an iPad swipes at any width, and a computer hovers even in a narrow window (below the 820-dot layout switch the hover rack simply holds fewer boards per row). This is a new job for the **pointer** switch, which until now only decided how big controls draw (and whether the Rotate button shows), so the CLAUDE.md Layout section needs one sentence about it. Width still picks the page layout, and height still picks short-screen behaviour.
- **D-05:** **On the hover rack, a finger tap turns first and opens second.** On a touch-screen laptop (or any finger tap on the hover rack), the first tap turns the board and shows its caption; a second tap, or Open This Board, opens it. A mouse click opens straight away.
- **D-06:** **A phone held sideways gives the rack the screen.** On a short screen the rack takes most of the screen's height so boards and their words stay readable, and Shape a New Board is a scroll below. (On an upright phone, Shape a New Board stays on the first screen, per the brief.)

**First look and words**
- **D-07:** **The board you're working on is turned when the home page opens.** That's the board open in the editor, saved or not, and on the swipe rack it's scrolled to the middle, so coming back home shows where you were. With nothing open, the first board in the rack.
- **D-08:** **The hint always shows**, in muted ink beside the count: "15 boards · point to turn, drag to move" on the hover rack and "15 boards · hold to move" on the swipe rack.
- **D-09:** **The same rack whatever the count.** One board stands turned with its caption under it. There is no separate look for one or two boards, which is most new shapers on Saturday.

**Going live and backups**
- **D-10:** **One go-live** (the founder chose this over the recommended two). The database change goes to the live site first; it changes nothing anyone sees, and nothing reads it until the code ships (Database rule: additive change, production before the code). Then the whole rack goes in one push on the founder's go: the look, the turn, both racks and moving boards. It's all or nothing by Wednesday 2026-10-07 evening.
- **D-11:** **The fallback, only if hold-and-drag isn't reliable on the founder's iPad by Wednesday:** the swipe rack still goes live, and on phones and iPads a board is moved with ⋯ → Move left / Move right until hold-and-drag is fixed after the showing. The plan should make this a small, prepared switch, not a rebuild.
- **D-12:** **No move buttons on phones and iPads otherwise.** ⋯ keeps Move left / Move right on the hover rack only; the swipe rack's ⋯ is Rename, Duplicate and Delete, as today. Consequence, accepted by the founder: someone using a screen reader on a phone can browse and open boards but can't move them. This narrows the brief's constraint 8 for touch screens; computers keep the keyboard way (Alt + arrow) and ⋯.

**Carried forward from Phase 14 (the same go-live pattern)**
- **D-13:** **A read-only report on the real saved boards before the push** (14 D-18). The founder runs one command in their own terminal, as with earlier production steps, and it only reads. For every saved board it checks that the rack can draw it (side profile and outline build), and it prints counts per account and any board the rack would drop, by id only.
- **D-14:** **One rehearsal walk after the go-live** (14 D-17). Phase 13's real-device walk runs on the site as the shapers will see it, Board Rack included, before the freeze. Its walk sheet gains the rack.
- **D-15:** **Nothing announces the change** (14 D-19). No "what's new" notice. The rack and its hint (D-8) speak for themselves.

### Claude's Discretion
- **Where the order is stored:** one ordered list of the shaper's board ids on their account (for example a nullable column on `user_preferences`, null until the first move, which is D-03's "automatic until you arrange"), or a position on each board. Research decides; the account list is the leading candidate because D-03's "not arranged yet" state falls out of null. Either way the order follows the shaper to every device (the brief's acceptance criteria). Two devices moving boards at once: last write wins, without corrupting the list (a board missing from the list goes per D-01; an id with no board is skipped).
- **The exact timings and sizes** (hold about 420 ms, swell from about 120 ms, 6-dot drag threshold, 46-dot edge zone, about 180 ms rest before a board finishes turning, 48-dot slots on a computer and 40 on a phone, rack heights) start from the sketches' figures in `references/board-rack.md` and may be tuned on real devices.
- **How the turn maths is split** into pure, tested functions under `lib/geometry/` (Rule 1): at least the projected silhouette at an angle, the stringer, the half-extent, and the room the rack makes around turning boards.
- **Reduced motion:** turn and drop without the glide (the brief's constraint 8).

### Deferred Ideas (OUT OF SCOPE)
- **Moving boards with a screen reader on a phone** — not in this phase (D-12). A later accessibility pass could add it without visible buttons.
- **Making hold-and-drag reliable on older Safari** — only if D-11's fallback is taken; then it's the first fix after the showing.
- Reviewed todos not folded (13 pending todos, none about the rack): they all stay in `.planning/todos/pending/`.
</user_constraints>

<phase_requirements>
## Phase Requirements

No `.planning/REQUIREMENTS.md` exists; the SPEC's own numbering (R1 to R10) is the contract. [VERIFIED: 15-SPEC.md:36-87]

| ID | Description | Research Support |
|----|-------------|------------------|
| R1 | Boards held sideways showing their rocker; name and card line in one line of vertical text | `buildBoardProfile` / `summarizeDesignWith` give the side profile from the board's own blank copy (Q C); `formatSummaryLine` gives the line in both systems; SVG `<text>` with `rotate(-90)` (Q D) |
| R2 | One true scale, one floor line, the whole quiver | Pure `rack-layout` (scale = tallest board, never below the 7'0" reference; rows balanced) in `lib/geometry/` (Q D) |
| R3 | The real turn (exact at 0 and 90 degrees) | Pure `rack-art.ts` port of the sketch formula; tests against `screen-tiles` sampling at 0 and the TEMPLATE silhouette at 90 (Q D) |
| R4 | The app's drawing style | `--surf-board-fill`, `--surf-line`, `--surf-ink`, `--surf-ink-muted`, `--surf-accent-ink` tokens exist in `app/globals.css` (Q D / UI notes) |
| R5 | Computer: boards turn as the cursor passes | Hover rack: one SVG, an rAF loop writing attributes through refs, pointer events (Q F); chosen by `useCoarsePointer()` (Q E) |
| R6 | Phone/iPad: swipe along the rack | Native `overflow-x` scroller + scroll-snap, rAF-throttled scroll listener turns each board by its distance from the middle (Q F) |
| R7 | Section called Board Rack with the count | Heading text change in the new rack; three e2e assertions currently look for "Your Boards" (Q G) |
| R8 | The shaper sets the order | Account-level `rack_order` list, `saveRackOrder` action, pure merge/move functions (Q A, B); drag / Alt+arrow / Move left-right (hover), hold-and-drag (touch) (Q F) |
| R9 | The unsaved board stays first and can't be moved | Pinned slot 0 in the merge function; never written to the list (Q B) |
| R10 | Live before the freeze | One-day wave order, tracer first, D-11 prepared switch, D-13 report, migration to production before the push (Q H, I) |
</phase_requirements>

## Summary

The phase is mostly **new pure maths plus one new account column plus a client-only interactive SVG**. Nothing in the data path has to be invented: the server already reads every saved board (`app/page.tsx` `BoardRackData`), validates it with `rackModelsFromRows`, and ships the full snapshot to the client (needed to open a board). The rack's drawing inputs are the same two objects every screen already builds, `BoardSideProfile` (from `buildBoardProfile`) and `OutlineGeometry` (from `buildOutline`). Measured this session on this Mac in Node: `summarizeDesign` costs about **1.5 ms per board** (it is called twice per board today: once in `rackModelsFromRows`, once on every render of every card), while the profile + outline + 65 samples the rack needs cost about **0.25 ms per board** (4 presets x 5 repeats, `prepareBlank` included). Thirty boards is under 10 ms in Node, so compute the art **on the client once per list change** (`useMemo`), and also once on the server inside `rackModelsFromRows` purely so a board whose art cannot be built is dropped there (WR-05) rather than throwing in the browser.

For the order, the **account-level ordered id list wins**. A nullable text column on `user_preferences` (JSON text of board ids, exactly the `hidden_blank_makers` precedent, migration 0007) is one write per move, makes D-03's "not arranged yet" state equal to `null`, tolerates two devices (last write wins; a merge function skips unknown ids and puts unlisted boards first per D-01), and needs no change to account deletion (the column sits on a row `deleteAccountData` already deletes). A per-board `position` column would need N updates per move, ambiguous null semantics, and duplicates under concurrent devices. Two small server hooks (`saveModel` insert, `duplicateModel`) place the new id (D-01 / D-02) only when the list is non-null; both are fail-soft because the merge already puts an unlisted board first.

The two real risks are **hold-and-drag on real Safari** (the sketch was only proved with a mouse; WebKit makes a `touchmove` non-cancelable once a scroll has begun) and **testing saved boards in Playwright** (the e2e suite is signed out against a fake database, so no saved board ever renders; a test-only stand-in route in the style of `/test-error` is needed). Both have prepared answers below.

**Primary recommendation:** Build tracer-first: schema + migration on dev, then the pure modules (`rack-art`, `rack-layout`, order functions) with tests, then a read-only hover rack on real data, then the swipe rack, then reordering (hover first, hold-and-drag last behind the one-constant D-11 switch), then the `--rack-report` script, CLAUDE.md sentence, e2e updates and the device walk. Migrate production first, push on the founder's go.

## Architectural Responsibility Map

| Capability | Primary Tier | Secondary Tier | Rationale |
|------------|-------------|----------------|-----------|
| Read saved boards + stored order | API / Backend (Server Component `BoardRackData`) | Database (`models`, `user_preferences`) | Existing pattern: uncached read inside Suspense, `app/page.tsx:46-74` |
| Drop an undrawable board (WR-05) | API / Backend (`rackModelsFromRows`) | Browser (try/catch belt and braces) | A client throw would take the whole home screen down |
| Side profile + outline per board (art data) | Browser / Client (`useMemo`) | API (validation only, result discarded) | Functions can't cross the RSC boundary; the snapshot is already in the client |
| Turn maths, layout maths, height marks | Pure `lib/geometry/` (no tier) | — | CLAUDE.md Rule 1; verified in Vitest |
| Order merge / move / insert functions | Pure `lib/models/` (no tier) | — | Same module family as `rack-order.ts` |
| Persisting the order | API / Backend (`saveRackOrder` Server Action) | Database (`user_preferences.rack_order`) | Auth + ownership checks live in actions; client never sends an owner |
| Hover vs swipe choice | Browser / Client (`useCoarsePointer`) | — | Pointer is a device property the server can't know |
| Drag, hold, scroll gestures, rAF turn loop | Browser / Client | — | Pointer events + refs; no server involvement |
| Unit-aware words (card line, height-line labels) | Pure `lib/geometry/` via `units.ts` | Browser (renders) | Rule 2 |
| Production readiness report | Script (`scripts/check-saved-boards.ts --rack-report`) | Database (read-only) | Phase 12/14 pattern |

## Standard Stack

No new package is allowed (SPEC constraint 9) and none is needed. [VERIFIED: 15-SPEC.md:119]

### Core (all already installed; versions read from package.json this session)
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| next | 16.3.6 | App Router, Server Actions, Suspense streaming | Already the app |
| react / react-dom | 19.2.8 | `useSyncExternalStore`, refs, effects | Already the app |
| drizzle-orm | ^0.45.2 | `userPreferences` upsert for the order | Pattern in `app/actions/units.ts` |
| drizzle-kit | ^0.31.10 | `generate --name` writes the migration | `--name` flag verified via `drizzle-kit generate --help` this session |
| @base-ui/react | ^1.7.0 | The ⋯ menu (`Menu`) reused from `rack-card-menu.tsx` | Existing component |
| vitest | ^4.1.11 | Pure-module tests (node environment) | `vitest.config.ts` includes `lib/**/*.test.ts` and `components/**/*.test.ts` |
| @playwright/test | ^1.63.0 | Browser tests: iphone (WebKit), android (Chromium), desktop (Chromium) | Existing projects |

### Supporting
| Item | Purpose | When to Use |
|------|---------|-------------|
| `components/design/use-viewer-media.ts` `useCoarsePointer()` | The one existing JS read of `(pointer: coarse)` with a safe server snapshot | Choosing hover vs swipe rack (D-04). Add a `useReducedMotion()` beside it with the same `useMediaQueryMatch` helper |
| `lib/preference-handoff.ts` write queue (`createPreferenceWriteQueue`) | Serialised retrying writes | Optional for `saveRackOrder`; Next already dispatches Server Actions one at a time |
| `e2e/slider-touch.spec.ts` CDP recipe (`Input.dispatchTouchEvent`) | Real trusted touch input (Chromium only) | Swipe and hold-and-drag e2e on the `android` project |

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| `text` JSON column | `jsonb` | Equivalent here (never queried inside); text copies the proven 0007 migration and `check-preference-columns.ts` "text" check, so fewer unknowns in a one-day build |
| Per-board `position` on `models` | — | Rejected: N writes per move, null ambiguity, concurrent duplicates, and `saveModel`'s insert names the new column too |
| Server-computed art arrays | — | Rejected: grows the RSC payload on top of snapshots already shipped; compute is 0.25 ms per board |
| `scrollend` event for "settled" | debounce timer | `scrollend` only exists in Safari 26.2+ (cited below); the founder's iPad is older |

**Installation:** none.

**Version verification:** versions above are read from `/Users/kontoes/Code/shaper/package.json` this session; Node v24.19.0, Playwright 1.63.0, browsers present in `~/Library/Caches/ms-playwright`: chromium-1243, webkit-2359. [VERIFIED: commands run this session]

## Package Legitimacy Audit

No external package is installed by this phase, so there is nothing to audit.

**Packages removed due to [SLOP] verdict:** none
**Packages flagged as suspicious [SUS]:** none

## Architecture Patterns

### System Architecture Diagram

```
Signed-in shaper opens "/"
        |
        v
app/page.tsx  Home --auth()--> no userId ----------------------> <SetupScreen models=[] />
        |  userId
        v
<Suspense fallback=<SetupScreen models=[] />>
  BoardRackData (server)
    |-- listModels(userId)                     rows (id,name,snapshot,updatedAt)
    |-- readRackOrder(userId)  [try/catch]     string[] | null      <-- NEW (fail-soft: null)
    |-- rackModelsFromRows(rows)               drops a board that can't parse/summarise/DRAW  <-- extended
    v
<SetupScreen models rackOrder>  (client, SSR'd)
    |-- useDesign(): modelId, hasBoardInProgress, outlineGeometry, sideProfile
    |-- applyStoredOrder(entries, rackOrder)   in-progress first; null => sortRackEntries   <-- NEW pure
    |-- useCoarsePointer()  -- false on server, real value after hydration
    v
  <BoardRack>  (renders heading + count + hint; rack body only after mount, height reserved)
      |                                |
  fine pointer                    coarse pointer
      v                                v
  HoverRack (one SVG, all rows)   SwipeRack (overflow-x scroller + one SVG)
   pointermove -> cursor u        scroll (rAF) -> distance to middle
   -> f[b] per board (0..1)       -> f[b] per board
   -> turnedBoardPath(art, f*90deg)  (pure lib/geometry/rack-art.ts)  -> d="" via refs, no React re-render per frame
   rest 180 ms -> nearest finishes       |
   press+drag >6 / Alt+arrow / Move      hold ~420 ms -> lift -> slide -> drop
        |                                |
        +------------ moveRackEntry(list, id, toIndex) (pure) ------------+
                                  |
                  local order state (optimistic) + saveRackOrder(ids) Server Action
                                  |
                 auth() -> parse -> filter to own ids -> upsert user_preferences.rack_order
                                  |
   Open: onSelectModel(model) -> SetupScreen.handleSelectModel (unchanged replace-board check)
   Rename / Duplicate / Delete -> existing actions (+ D-02 hook in duplicateModel) -> revalidatePath("/")
```

### Recommended Project Structure
```
lib/geometry/
├── rack-art.ts          # buildRackBoardArt, turnedBoardPath/points, stringerPoints, halfExtent  (pure)
├── rack-layout.ts       # rackScale, rackRows, slotPosition, slotAt, rackHeightMarks, phone rack height (pure)
├── screen-tiles.ts      # export `silhouette` + `sidePoints` (currently private) so rack tests share one source
├── design.ts            # add exported `designSideProfile(fields, rules)`; summarizeDesignWith calls it
lib/models/
├── rack-order.ts        # + parse/serialise column, applyStoredOrder, moveInOrder, insertAfter, insertFirst
├── rack-models.ts       # + art build inside the try, `dropped` ids for the report
├── rack-gesture.ts      # pure hold/drag/rest reducers (testable without a DOM)  [recommended]
lib/db/queries.ts        # + readRackOrder(clerkId)
app/actions/rack-order.ts  # saveRackOrder
app/design/actions.ts    # D-01 hook in saveModel insert; D-02 hook in duplicateModel
app/test-rack/page.tsx   # test-only stand-in route (flag + literal NODE_ENV), like app/test-error
components/setup/
├── board-rack.tsx       # heading, count, hint, kind switch, dialogs (kept)
├── hover-rack.tsx / swipe-rack.tsx / rack-caption.tsx / rack-board.tsx
├── rack-card-menu.tsx   # + Move left / Move right (props: showMove, canMoveLeft, canMoveRight)
```

### Pattern 1: The account-order column (copy of the 0007 precedent)
**What:** nullable text column holding JSON text of board ids; null = "not arranged yet".
**Schema change (insert after `hiddenBlankMakers`):**
```ts
// lib/db/schema.ts  — existing line 97 is: hiddenBlankMakers: text("hidden_blank_makers"),
// Phase 15 (D-03): the shaper's own order of their saved boards, as JSON text of board ids
// (e.g. `["<uuid>","<uuid>"]`), saved boards only. Null = not arranged yet, which means today's
// automatic order. Read through lib/models/rack-order.ts's allow-list.
rackOrder: text("rack_order"),
```
[VERIFIED: schema.ts:97 reads `hiddenBlankMakers: text("hidden_blank_makers"),`; drizzle/0007_hidden_blank_makers.sql reads `ALTER TABLE "user_preferences" ADD COLUMN "hidden_blank_makers" text;`]

**Command flow** (from CLAUDE.md "Database" and `package.json` scripts; each verified this session):
1. Edit `lib/db/schema.ts`.
2. `npx drizzle-kit generate --name rack_order` (the `npm run db:generate` script is plain `drizzle-kit generate`; `--name` is a verified flag) writes `drizzle/0009_rack_order.sql` expected to contain `ALTER TABLE "user_preferences" ADD COLUMN "rack_order" text;` and `drizzle/meta/0009_snapshot.json` plus a `_journal.json` entry. Commit all three. [ASSUMED: exact generated SQL text; same shape as 0007]
3. `npm run db:migrate` applies to the **development** branch (reads `.env.local`, `drizzle.config.ts`).
4. Check it: extend `scripts/check-preference-columns.ts` (its `NEW_COLUMNS` list, the `information_schema` `column_name in (...)` clause, and the "4 of 4" wording) with `{ name: "rack_order", type: "text" }`, run it against dev.
5. **Before the push, with the founder present:** `npm run db:migrate:prod` (pulls production env to a temporary file and migrates), then the same check script against production using its documented `CHECK_ENV_FILE=.env.production.pull` recipe (script header lines 41-49). Additive, so production first. The old deployed code never names the column. Never name `.env*` paths in an agent Bash call (project memory: classifier denies); the founder runs it in their terminal.

**Tests that touch the schema:** no existing test pins the column list of `user_preferences`. `lib/db/account-deletion.test.ts` scans for tables with a `clerk_user_id` column (still exactly `models` and `user_preferences`; unchanged). `lib/db/ownership.test.ts` reads `schema.ts` only for the `blanks` block. So adding a column needs **no** test edit by itself. Account deletion needs **no** change: `accountDeletionStatements` deletes the whole `user_preferences` row, which carries the new column. [VERIFIED: account-deletion.ts:30-37 deletes `userPreferences` where `clerkUserId` matches; account-deletion.test.ts:33-53]

**Reading must fail soft** (the not-yet-migrated window, same as `blank-makers-server.ts` documents): wrap `readRackOrder` in try/catch in `BoardRackData`, fall back to `null` (automatic order), log server-side. [VERIFIED: lib/blank-makers-server.ts header: "degrades to `null` ... or the `hidden_blank_makers` column not existing yet between the push to `main` and the production migration"]

### Pattern 2: Pure merge (extends `lib/models/rack-order.ts`)
**What:** `applyStoredOrder(entries, storedOrder)` is the only place the order rule lives; components render its output.
```ts
// lib/models/rack-order.ts  (additions; existing sortRackEntries stays and is the null path)
export function applyStoredOrder<T extends RackEntry>(
  entries: readonly T[],
  storedOrder: readonly string[] | null,
): T[] {
  if (storedOrder === null) return sortRackEntries(entries);      // D-03: automatic until the first move
  const inProgress = entries.filter((e) => e.kind === "in-progress");          // R9: pinned first
  const saved = entries.filter((e): e is Extract<T, SavedRackEntry> => e.kind === "saved");
  const byId = new Map(saved.map((e) => [e.id, e]));
  const listed: typeof saved = [];
  const seen = new Set<string>();
  for (const id of storedOrder) {                                   // unknown ids skipped, repeats ignored
    const entry = byId.get(id);
    if (entry && !seen.has(id)) { listed.push(entry); seen.add(id); }
  }
  const unlisted = sortRackEntries(saved.filter((e) => !seen.has(e.id)));      // D-01 fallback: first, newest-touched first
  return [...inProgress, ...unlisted, ...listed];
}
```
Plus `parseRackOrderColumn(text)` (JSON.parse in try/catch, array of strings, de-duplicated, capped; anything else is `null`), `rackOrderColumnValue(ids)` (`JSON.stringify`), `parseRackOrderInput(value)` (strict, all-or-nothing, like `parseHiddenBlankMakersInput`), `moveInOrder(ids, id, toIndex)`, `insertAfter(ids, afterId, id)`, `insertFirst(ids, id)`. All pure, tested in `lib/models/rack-order.test.ts` alongside the existing cases. The existing file's own invariants (`id` is identity, never mutate input, deterministic ties) carry over.

### Pattern 3: Server action for a move (copy `app/actions/blank-makers.ts` / `units.ts`)
```ts
"use server";
// app/actions/rack-order.ts
import { auth } from "@clerk/nextjs/server";
import { eq } from "drizzle-orm";
import { db } from "@/lib/db/client";
import { models, userPreferences } from "@/lib/db/schema";
import { parseRackOrderInput, rackOrderColumnValue } from "@/lib/models/rack-order";

export async function saveRackOrder(orderedIds: readonly string[]): Promise<void> {
  const { userId } = await auth();
  if (!userId) return;                                   // signed out: nothing to arrange, resolve quietly
  const parsed = parseRackOrderInput(orderedIds);
  if (parsed === null) return;
  const own = await db.select({ id: models.id }).from(models).where(eq(models.clerkUserId, userId));
  const ownIds = new Set(own.map((r) => r.id));          // a foreign or stale id is never stored
  const value = rackOrderColumnValue(parsed.filter((id) => ownIds.has(id)));
  await db.insert(userPreferences)
    .values({ clerkUserId: userId, rackOrder: value })
    .onConflictDoUpdate({ target: userPreferences.clerkUserId, set: { rackOrder: value, updatedAt: new Date() } });
  // No revalidatePath: the rack already shows the new order locally.
}
```
Shape taken from `app/actions/blank-makers.ts` (`auth()` first, `if (!userId) return;`, upsert with `onConflictDoUpdate`). [VERIFIED: app/actions/blank-makers.ts, app/actions/units.ts read this session]

**`lib/db/ownership.test.ts` must be extended or the new file is unguarded.** It lists files explicitly. [VERIFIED: ownership.test.ts:14-21 constants; :72-79, :94-102, :141-149 lists]. Add `app/actions/rack-order.ts` to: the "awaits auth() before any database call" list, the "no caller-supplied owner parameter" list, and the "constrains on the owning-user column" list, plus a new `exports exactly the expected action` case mirroring lines 116-139 (`expect(fns).toEqual(["saveRackOrder"])`). Note the insert-statement check at lines 162-165 needs `clerkUserId\s*:` in each insert (present above) and the select check needs `eq(X.clerkUserId,` (present). Keep `db.` calls inside the scanned files; keep pure helpers in `lib/models/` (a `"use server"` file may only export async functions). If the D-01/D-02 hooks are added to `app/design/actions.ts`, the test at ownership.test.ts:108-114, `expect(fns).toEqual(["deleteModel", "duplicateModel", "renameModel", "saveModel"]);`, stays true as long as no new exported function is added there (keep hooks as non-exported helpers in that file).

### Pattern 4: D-01 and D-02 hooks (fail-soft, only when a list exists)
- `saveModel`, `modelId === null` branch (actions.ts:67-73): after the insert, if the shaper's stored list is non-null, write `insertFirst(list, row.id)`. Wrapped in try/catch: a failed placement must never fail a save (the merge puts an unlisted board first anyway, which is D-01's result).
- `duplicateModel` (actions.ts:143-166): after the insert, if the list is non-null, `insertAfter(list, modelId, row.id)`; if the original isn't in the list, `insertFirst`. Same try/catch. If the list is **null**, do nothing: the copy's fresh `updatedAt` floats it to the front exactly as today's rule says (D-03: automatic until the first move). **Flag for the founder:** that means in an un-arranged rack a duplicate lands first, not beside its original, until the shaper has moved something. This is the literal reading of D-03 ("keeps today's automatic order until the shaper first moves a board"); D-02 applies once an order exists.
- `deleteModel`: **no hook.** An id with no board is skipped by the merge, and the next `saveRackOrder` write prunes it (the action filters to the shaper's own existing ids).
- `renameModel` and every autosave `saveModel` update change `updatedAt` only. Once a list exists the order ignores `updatedAt`, so editing never moves a board (D-03). Before the first move, editing still floats a board to the front as today.

### Pattern 5: The side profile helper (no new maths, one new export)
`summarizeDesignWith` already contains the one correct recipe for a saved board's profile from its snapshot fields (own blank copy via `rules.prepare(blank.copy)`, `thinningStartsOf(blank)`, `handSetCurve`). Extract those lines into an exported `designSideProfile(fields, rules)` in `lib/geometry/design.ts` and have `summarizeDesignWith` call it, so the rack and the card numbers can never read different profiles. `design.test.ts` and the Phase 14 suites already pin `summarizeDesign`'s outputs, so the extraction is guarded. [VERIFIED: design.ts:199-221 builds the profile exactly this way]

For the **in-progress board** don't rebuild: `useDesign()` exposes `outlineGeometry` and `sideProfile` already (design-store.tsx:401, 416; built at :764 and :788). For a **saved** board build `buildOutline(fields.outline)` and `designSideProfile(fields, RULES_LIVE-equivalent {prepare: prepareBlank, handSetCurve: "root"})`.

### Pattern 6: Turn maths in `lib/geometry/rack-art.ts`
Port the sketch formula verbatim. The sketch's 65 stations are `i = 0..64`, `s = L*i/64` (quiver-data.ts:128-134), `half = sampleOutline(geometry, s)`. [VERIFIED: sketch source `quiver-data.ts` lines 127-136]
```ts
// per station i: r = rockerAt(s), d = deckAt(s), h = half-width; tMid = max(deck) / 2
// left  edge x = xc - ext,  right edge x = xc + ext,  y = floorY - station * scale
// xc  = ((r + d) / 2 - tMid) * cos(theta)
// ext = sqrt(((d - r) / 2)^2 * cos^2(theta) + h^2 * sin^2(theta))
// stringer x = (d - tMid) * cos(theta)
// theta >= 1.5620 rad (about 89.5 deg): draw the exact TEMPLATE silhouette (carries the swallow's notch)
```
[VERIFIED: sketch 010 template engine `turnPath`, `outlinePath`, `stringerPath`, `halfExtent`, `boardPath` (`theta > 1.5620`); same formula text in `references/board-rack.md:72-84`.]

Reuse, don't copy: `screen-tiles.ts` already has the TEMPLATE silhouette (`silhouette(geometry)`, private, lines 81-91: right half tail to nose, left half back, then `{ station: geometry.centreCloseStation, w: 0 }`) and the side silhouette (`sidePoints`, private, lines 116-125). Export both so the rack's 90 degree frame **is** `silhouette(geometry)` and tests can compare against them.

**Known cosmetic edge:** at 89.5 degrees the drawn shape switches from the stations polygon to the silhouette, which adds only the swallow notch vertex. The sketch accepted this (the SPEC says "the notch appears as the turn completes"). Keep it.

### Pattern 7: Hover rack = one SVG, imperative frame loop
The sketch engine mutates `d`/`transform` attributes from a `requestAnimationFrame` loop (`kick()` schedules a frame). In React: render the board groups once (stable keys by board id, **a ref per path**), and have a `useRackFrame` hook own the rAF loop, the per-board turn fractions `f[b]` (eased toward targets) and positions, writing `setAttribute("d", ...)` and `transform` through refs. Do **not** put per-frame values in React state: 30 boards x 130 path points per frame is trivial for the DOM but not for re-rendering. Order, turned-board id and drag state live in React state/refs; frame values do not.

### Pattern 8: The test-only stand-in (so Playwright can see saved boards)
**Finding:** every e2e spec runs signed out on fake Clerk keys with `DATABASE_URL: "postgresql://user:pass@localhost:5432/shaper"`; phone-home.spec.ts:147-150 states it plainly: "cannot be reached by this suite: it runs signed out against a fake database, so no saved board and therefore no three-dot menu ever renders here". So a saved-board rack is untestable today. Copy the `/test-error` pattern (`app/test-error/page.tsx`, `lib/error-pages/forced-error.ts`): a route `app/test-rack/page.tsx` that renders `<SetupScreen models={standInModels(count)} rackOrder={null} />` only when `forcedErrorRouteEnabled`-style gate passes (`nodeEnv: process.env.NODE_ENV` literal + `SHAPER_RACK_STAND_IN === "1"`), `notFound()` otherwise; set the flag only in `playwright.config.ts` `webServer.env` (which `playwright.prod.config.ts` strips). Generate the stand-in boards from `BOARD_PRESETS` + `presetDesignFields` through `buildSnapshot`/`parseSnapshot` with varied lengths (the sketch's `quiver-data.ts` does exactly this and is in `sketch-source.tar.gz`). `saveRackOrder` resolves quietly signed-out, so moves work client-side in the stand-in; persistence across reload is **not** e2e-testable and stays a unit test plus a dev-branch manual check plus the UAT.

### Anti-Patterns to Avoid
- **A click handler re-added every rebuild** (sketch note: one tap acted two or three times, so ⋯ opened and shut at once). Attach pointer handlers once on the SVG/scroller via React props or a single effect; the Base UI `Menu` trigger must stay a sibling of the board button, never a descendant (same reasoning as `board-rack-card.tsx` header comment).
- **Deciding the rack by width.** Pointer decides (D-04). Never reach for `max-shell:`.
- **`touch-action: none` on the whole hover-rack SVG** (the sketch's CSS has it): on a touch laptop it blocks vertical page scroll over a 290-380 dot tall rack. Use `touch-action: pan-y` there and make mouse/pen the only pointer types that start a drag (D-05 says a finger only taps).
- **Hand-typed conversions** (`304.8`, `25.4`, `10`) in components or in the new geometry files. The sketch's `heightMarks()` uses `304.8`. Use `inchesToMm(12)` and `centimetresToMm(50)` from `lib/geometry/units.ts` (Rule 2; `lib/units-isolation.test.ts` greps print surfaces for 25.4).
- **Per-card `summarizeDesign` on every render.** `board-rack-card.tsx:149` calls it inside render; the rack must compute summaries once per list change (`useMemo`).
- **`scrollend`** for "scroll settled": Safari only since 26.2.

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Side profile of a saved board | A second spline/profile in the rack | `buildBoardProfile` via the new `designSideProfile` extraction | The rack must read the same curves as ROCKER and the card litres (SPEC constraint 3) |
| Outline silhouette | New outline sampling | `buildOutline` + `silhouette()` from `screen-tiles.ts` | Already tested; carries the swallow notch |
| Card line text | A new formatter | `formatSummaryLine(summary, system)` | Rule 2, both systems, already tested |
| Foot / 50 cm height marks | `* 304.8` in a component | `inchesToMm` / `centimetresToMm` in a pure `rackHeightMarks` | Rule 2 |
| Account setting plumbing | A new endpoint or cookie | `user_preferences` column + upsert action (units/blank-makers pattern) | Proven, ownership-tested |
| Order allow-list parsing | Ad-hoc `JSON.parse` in the page | `parseRackOrderColumn` modelled on `parseHiddenBlankMakersColumn` | Never throws; junk reads as "not arranged" |
| ⋯ menu | A new menu | `RackCardMenu` (Base UI) + Move left / Move right items | Already thumb-sized under `coarse:` |
| Rename / Duplicate / Delete dialogs and error state | New dialogs | `board-rack.tsx` lifted state, `RenameDialog`, `DeleteConfirmDialog` | Keep behaviour identical |
| Media-query React state | Another `matchMedia` hook | `useMediaQueryMatch` in `use-viewer-media.ts` (add `useReducedMotion`) | Hydration-safe pattern already there |
| Test-only route gate | A new flag mechanism | The `forced-error.ts` pattern | Provably dead in a production build |
| Trusted touch input in tests | Synthetic `dispatchEvent` | CDP `Input.dispatchTouchEvent` as in `slider-touch.spec.ts` | Synthetic events are untrusted and don't exercise pointer capture / touch-action |

**Key insight:** every number on the rack already exists in a tested function; the new code is projection, layout, ordering and gestures. Anything that decides what a shaper reads must land in `lib/geometry/` or `lib/models/` with tests, not in a component.

## Runtime State Inventory

Not a rename/refactor phase. The phase **adds** one nullable column; nothing existing is renamed, so the five categories are all "nothing to migrate":

| Category | Items Found | Action Required |
|----------|-------------|------------------|
| Stored data | `models` rows unchanged; `user_preferences` gains `rack_order` (all null at first) | Additive migration only; no data migration |
| Live service config | None. Verified: no n8n/Datadog-style config names the section | None |
| OS-registered state | None | None |
| Secrets / env vars | None new. The e2e stand-in flag `SHAPER_RACK_STAND_IN` is test-only, never set in Vercel or `.env*` | Set only in `playwright.config.ts` `webServer.env` |
| Build artifacts | None | None |

## Common Pitfalls

### Pitfall 1: Hold-and-drag on real iOS Safari (the main schedule risk)
**What goes wrong:** the hold fires, the board lifts, but the page still scrolls under the finger, or the browser sends `pointercancel`, or a long-press menu / text selection appears.
**Why it happens:** WebKit sends `touchmove` and lets scrolling proceed asynchronously; once a scroll has begun the event is `cancelable: false` ("too late to stop scrolling"). Listeners added dynamically after touchstart have also been unable to prevent scrolling on iOS. [CITED: bugs.webkit.org/show_bug.cgi?id=184250 and 184251, found via web search; WebKit behaviour as summarised there, not re-run]
**How to avoid:** (1) register the non-passive `touchmove` listener **once at mount** on the scroller (the sketch does: `sc.addEventListener("touchmove", e => { if (this.drag) e.preventDefault(); }, { passive: false })`), not at touchstart; (2) only `preventDefault` after the hold completes, and cancel the hold if the finger moves more than ~8 dots first (then it is a swipe); (3) `-webkit-touch-callout: none`, `-webkit-user-select: none; user-select: none`, and a `contextmenu` `preventDefault` on the scroller; (4) keep `touch-action: pan-x pan-y` on the scroller; (5) treat the result as unproven until the founder's iPad confirms it. [VERIFIED: sketch 011 template lines 103, 314-344 hold timer, touchmove, contextmenu]
**Warning signs:** on the iPad the rack scrolls while a board is "lifted"; `pointercancel` arriving mid-drag. **The sketch README says it directly: "On a real phone the hold depends on the browser not starting a scroll first ... needs checking on the founder's iPhone and Android" and was only tested "in headless Chromium with a mouse".** [VERIFIED: 011-phone-rack-reorder/README.md:47-59]

### Pitfall 2: D-11 must be a one-constant switch
**What goes wrong:** the fallback becomes a rebuild on Wednesday night.
**How to avoid:** one exported constant (e.g. `TOUCH_HOLD_TO_MOVE = true` in `components/setup/rack-config.ts`) read in three places only: the swipe rack's hold handlers (off = no hold timer, no non-passive listener), the heading hint ("hold to move" omitted when off), and `RackCardMenu`'s `showMove` (on for the hover rack always; on for the swipe rack **only when the constant is false**, per D-11; D-12 says otherwise it stays off). A tiny Vitest on a pure `movesOffered(kind, holdEnabled)` pins the matrix. Build the Move left / Move right items once for the hover rack and the fallback gets them for free.

### Pitfall 3: `pointer: coarse` on iPad Safari
**What goes wrong:** assuming an iPad with a trackpad reports a fine pointer. **Cited finding:** Safari on iPad reports `pointer: coarse` true, `any-pointer: coarse` true, `hover: none` true whatever input device is used (WebKit bug 209292, 2020, iOS 13.4 era). [CITED: bugs.webkit.org/show_bug.cgi?id=209292; current status on iPadOS 15+ not verified this session, so treat as MEDIUM] **Consequence for D-04:** the founder's iPad always gets the swipe rack, which is what D-04 wants; a trackpad on an iPad also swipes. Do not use `(hover: hover)` as the switch (it would put every iPad on the hover rack if it were ever wrong in the other direction). Keep `(pointer: coarse)` because it is the existing switch (`@custom-variant coarse (@media (pointer: coarse));`, globals.css:82; `COARSE_POINTER_QUERY = "(pointer: coarse)"`, use-viewer-media.ts:47). Hybrid touch laptops report a fine primary pointer, so they get the hover rack and D-05's tap-turns-first, decided per event by `event.pointerType === "touch"`.

### Pitfall 4: Hydration and layout flash
`useCoarsePointer()` returns `false` on the server and on the first client frame (use-viewer-media.ts:52-54), so every touch device would briefly render the hover rack. The rack also needs a measured container width, so it cannot be laid out on the server anyway. **Render the heading, count and a fixed-height empty well on the server; mount the rack body after mount** (a `useSyncExternalStore` "mounted" flag, or reading `useCoarsePointer` only after an effect-set `mounted`). Reserve the same height the rack will take so "Shape a New Board" doesn't jump (on a phone the height is derived from the scroller's clientHeight, see Pitfall 6).

### Pitfall 5: Programmatic scroll and scroll-snap on iOS
Setting `scrollLeft` programmatically in a scroll-snap container has had snap bugs on WebKit (bug 160622: "Scroll snap may not happen when scrollLeft is set programmatically"). [CITED: bugs.webkit.org/show_bug.cgi?id=160622, via web search] **How to avoid:** always assign exact multiples of the slot width (`index * slotWidth`) so the target is itself a snap point; use plain `el.scrollLeft = x` for D-07's initial centring (instant on every Safari; do not pass `behavior: "instant"`, which older Safari may not accept [ASSUMED]); do the initial centring in a layout effect before first paint; for "tap a side board to bring it to the middle" use smooth `scrollTo` only if `scroll-behavior` support is confirmed on the iPad, else jump.

### Pitfall 6: Phone rack height must follow the scroller, not `innerHeight`
The home page content sits in `div.min-h-0.flex-1.overflow-y-auto` (setup-screen.tsx:118) under a 48-dot top bar (`--phone-top-bar-h`). Safari's own bars change `innerHeight`. Measure the scroller's `clientHeight` with a `ResizeObserver` (precedent: `components/rails/rail-band-editor.tsx`, `components/viewer/callout-primitives.tsx`) and put the arithmetic in a pure `phoneRackHeight(clientHeight, fixedBands)` in `lib/geometry/rack-layout.ts`. Sketch figure: 357 dots at 390 x 664 (`board-rack.md:50-52`). SPEC acceptance: "Shape a New Board is on the first screen of an iPhone 14 page with 15 boards". Playwright's iPhone 14 profile is `{"width":390,"height":664}`, WebKit, touch. [VERIFIED: ran `devices["iPhone 14"]` this session]. D-06: on a short screen (`[@media(max-height:500px)]`, written inline per CLAUDE.md) the rack takes most of the height and the presets are a scroll below; this must be height alone and must not read width or pointer.

### Pitfall 7: Server Action ordering and prop refresh
Next dispatches Server Actions one at a time ("The client currently dispatches and awaits them one at a time"), so two quick moves arrive in order. [CITED: node_modules/next/dist/docs/01-app/01-getting-started/07-mutating-data.md:207] A Server Function that calls `revalidatePath("/")` re-renders the page when viewing it, which re-sends all snapshots (revalidatePath.md: "Server Functions: Updates the UI immediately (if viewing the affected path)"). So: `saveRackOrder` calls **no** `revalidatePath`; the rack keeps the new order in local state. Rename / Duplicate / Delete do revalidate and bring a fresh `rackOrder` prop. Reconcile like this: client state = `localOrder ?? props.rackOrder`; run `applyStoredOrder(entries, thatList)` every render (it tolerates drift); on a duplicate, also apply the same pure `insertAfter` locally so the optimistic order matches what the server stored. No reset logic is needed because the merge is idempotent.

### Pitfall 8: Existing e2e that will fail
See Q G. Three assertions look for the heading "Your Boards" and one geometry test compares the in-progress card's box with a preset card's box.

### Pitfall 9: units-isolation scans
`lib/units-isolation.test.ts` expects every display site that renders a `DesignSummary` among `components/setup/{card-metadata-line,board-rack-card,preset-card}.tsx` and `components/app-settings-dialog.tsx` to import the units boundary, and requires at least two to be found (`expect(checked).toBeGreaterThanOrEqual(2)`, line ~259). Deleting `board-rack-card.tsx` is safe (`existsSync` guard) as long as `card-metadata-line.tsx` and `preset-card.tsx` stay. New geometry files must contain no `window`/`document`/React import (the pure-file checks near line 215).

### Pitfall 10: The "pinned unsaved board" can leak into the stored list
`saveRackOrder` must receive and store **saved ids only**; the in-progress entry has no id. Pure `moveInOrder` operates on the saved list, with the pinned slot handled by the caller (drop-index clamped to `>= 0` in the saved list, and a drag that starts on the in-progress board is refused with "The unsaved board stays first until it's saved").

## Code Examples

### Pointer and motion hooks (extend an existing file)
```ts
// components/design/use-viewer-media.ts — add beside useCoarsePointer
const REDUCED_MOTION_QUERY = "(prefers-reduced-motion: reduce)";
/** True when the shaper asked the system for less motion. Server snapshot false (no motion saved). */
export function useReducedMotion(): boolean {
  return useMediaQueryMatch(REDUCED_MOTION_QUERY, false);
}
```
Source for the helper shape: `use-viewer-media.ts:39-45`. The app has no reduced-motion handling today (grep of `prefers-reduced-motion|motion-reduce|motion-safe` over `app/`, `components/`, `lib/` returned nothing), so this is new, not a pattern to copy. Reduced motion: no eased turn (a board swaps between 0 and 90 degrees on target), no glide on drop, no slide when order changes.

### Layout maths (pure; port of the sketch `Rack` constructor, constants from the sketch)
```ts
// lib/geometry/rack-layout.ts — shape only; planner writes it from the sketch engine
// one scale: tallest = max(longest board mm, SEVEN_FEET_REFERENCE_MM)   // sketch: 84 * 25.4 -> use inchesToMm(84)
// fit(boardsH): s = boardsH / tallest; reserve = max(0, maxOutlineWidthMm * s + 18 - P);
//               cap = max(1, floor((CW - labelsW - reserve) / P))
// try boardsH = 380 (one row); if cap < n, boardsH = 290; rows = ceil(n / cap); per = ceil(n / rows)  // balanced
// slot k: row = floor(k / per), col = k % per, x = labelsW + reserve/2 + col*P + P/2
```
[VERIFIED: sketch `Rack` constructor and `slotPos`, `slotAt`; the sketch's content width is `CW = Math.min(1024, sz.w) - 64`, matching the app's `max-w-5xl px-8` container at setup-screen.tsx:132.] Note the sketch writes `84 * 25.4`; the real code must use `inchesToMm(84)`.

### Gesture state kept pure (testable with Vitest fake timers, no DOM)
Model hold, drag threshold, edge scroll and drop as reducers in `lib/models/rack-gesture.ts`: `pressDown`, `pressMove` (returns `swipe` | `drag` | `holding`), `holdElapsed`, `edgeScrollDelta(x, width, edge=46, speed)`, `dropSlot`. Component code only maps DOM events to these calls. This is the cheapest way to get coverage on the part that is hardest to test in a browser. Figures from the sketch: hold 420 ms, swell from 120 ms (`clamp((now - t0 - 120) / 300, 0, 1)`), mouse drag threshold 6, touch swipe threshold 8, edge zone 46. [VERIFIED: sketch 011 template lines 322, 443; README; board-rack.md:57-66]

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| `scroll` + timers to detect a settled scroll | `scrollend` event | Safari 26.2 (Dec 2025 per InfoQ) | Cannot be used: the founder's iPad is older; keep a debounce timer [CITED: infoq.com/news/2026/04/safari-scrollend-support] |
| `pointer: coarse` as "touch device" | Same, but unreliable for hybrids | — | Decide drag vs tap per event with `pointerType` as well |

**Deprecated/outdated:** none in play. No CSS 3D and no scroll-driven animations (SPEC constraint 6).

## Assumptions Log

| # | Claim | Section | Risk if Wrong |
|---|-------|---------|---------------|
| A1 | `drizzle-kit generate --name rack_order` emits exactly `ALTER TABLE "user_preferences" ADD COLUMN "rack_order" text;` (same shape as 0007) | Pattern 1 | Low: the generated file is reviewable before applying |
| A2 | iPadOS 15 to 18 Safari still reports `pointer: coarse` / `hover: none` with a trackpad attached (only the 2020 iOS 13.4 bug report was found) | Pitfall 3 | Low-medium: if a newer iPad reports `fine`, it gets the hover rack; D-05's per-event `pointerType` tap behaviour still makes it usable |
| A3 | Old Safari (< 15.4) may reject `scrollTo({behavior:"instant"})`; plain `scrollLeft =` is safe everywhere | Pitfall 5 | Low: plain assignment works regardless |
| A4 | A non-passive `touchmove` listener registered once at mount (not at touchstart) lets `preventDefault` stop scrolling on iOS 15-17 once a hold has completed without finger movement | Pitfall 1 | **High for the schedule**: if false the hold-and-drag fails on the founder's iPad and D-11's fallback is taken |
| A5 | Founder's wording is OK that an un-arranged rack puts a duplicate first (D-03 literal) rather than beside the original (D-02) | Pattern 4 | Low: one-line change in the hook if the founder wants D-02 in both states (would require writing a list on first duplicate, which would also "fix the order" and break D-03) |
| A6 | Per-account counts in the D-13 report are printed as an anonymous list (no Clerk user ids), consistent with the existing script header "Never a snapshot, a board name, a user id or the connection string" | Q H | Low: D-13 says "counts per account"; confirm anonymous is acceptable |
| A7 | Phone CPU is slower than this Mac by an unmeasured factor, but 30 boards x 0.25 ms leaves a wide margin | Q C | Low: only the first computation per list change runs the maths |

## Open Questions

1. **Does a duplicate in an un-arranged rack sit beside its original?**
   - What we know: D-02 says right after its original; D-03 says automatic order (copy first) until the first move.
   - What's unclear: whether the founder wants D-02 to override D-03 for the very first duplicate.
   - Recommendation: implement D-03 literally (no list written); mention it in the plan and ask at the UAT walk.

2. **Anonymous per-account counts in the report (D-13)?**
   - Recommendation: print counts sorted descending with no ids ("accounts: 9; boards per account: 31, 12, 7, ..."), reusing the script's no-ids convention; board ids only for dropped boards.

3. **Is hold-and-drag reliable on the founder's iPad 9th gen?** Unknown until a device run. Schedule it early (right after the swipe rack is on a dev server reachable from the iPad; `allowedDevOrigins "**.*"` from project memory) so D-11 is decided Tuesday, not Wednesday night.

4. **UI-SPEC.** There is no `15-UI-SPEC.md` in the phase folder (only CONTEXT, DISCUSSION-LOG, SPEC). `workflow.ui_phase` is true in `.planning/config.json`. Exact pixel values for captions and the vertical words fall back on the sketches' figures; the orchestrator decides whether to run `/gsd-ui-phase` first.

## Environment Availability

| Dependency | Required By | Available | Version | Fallback |
|------------|------------|-----------|---------|----------|
| Node | scripts, vitest, next | yes | v24.19.0 | — |
| Playwright + browsers | e2e | yes | 1.63.0; chromium-1243, webkit-2359 | — |
| vitest | unit tests | yes | 4.1.11 (110 tests in the files I ran passed in 2.3 s) | — |
| Neon development branch | `db:migrate`, report on dev | not probed (needs `.env.local`; project memory says it exists) | — | Run on the founder's machine |
| Vercel CLI + production env pull | `db:migrate:prod`, production report | not probed (founder's terminal step by project rule) | — | Founder runs it |
| Real iPad 9th gen / iPhone / Android | hold-and-drag proof, D-14 walk | founder only | — | D-11 fallback |

**Missing dependencies with no fallback:** none for the build. Real-device proof is the founder's.

## Validation Architecture

### Test Framework
| Property | Value |
|----------|-------|
| Framework | Vitest 4.1.11 (unit, node environment, no DOM) and Playwright 1.63.0 (iphone = WebKit 390x664, android = Chromium Pixel 7, desktop = Chromium 1280x800) |
| Config file | `vitest.config.ts` (includes `lib/**/*.test.ts`, `components/**/*.test.ts`), `playwright.config.ts` (port 3100, `PW_PORT` override), `playwright.prod.config.ts` |
| Quick run command | `npx vitest run lib/models lib/geometry/rack-art.test.ts lib/geometry/rack-layout.test.ts lib/db` |
| Full suite command | `npm test` (then `npm run test:e2e`, ideally detached with a monitor, then `npm run build` from the main checkout, `npm run lint`) |

### Phase Requirements to Test Map
| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| R1 | A saved board's rack art builds from its snapshot (profile + outline, 65 finite stations); card line unchanged | unit | `npx vitest run lib/geometry/rack-art.test.ts lib/models/rack-models.test.ts` | Wave 0 (new / extend) |
| R2 | One scale = tallest board, never below 7'0"; rows balanced; every board placed once; `slotAt(slotPos(k)) == k` | unit | `npx vitest run lib/geometry/rack-layout.test.ts` | Wave 0 |
| R3 | At theta 0 left/right edges equal `rockerAt - tMid` / `deckAt - tMid` at every station; at 90 degrees the path **is** `silhouette(geometry)` (fish preset = swallow, notch vertex present); stringer inside the polygon for a sweep of angles | unit | `npx vitest run lib/geometry/rack-art.test.ts` | Wave 0 |
| R3 | Test inputs come from `BOARD_PRESETS`/`presetDesignFields` through the app's own `buildBoardProfile`/`buildOutline` (the `presetBoard` helper in `screen-tiles.test.ts:35-80`), plus a hand-set board (no blank) | unit | same | Wave 0 |
| R4 | Theme tokens used exist in `app/globals.css` (`--surf-board-fill`, `--surf-line`, `--surf-ink`, `--surf-ink-muted`, `--surf-accent-ink`); no text crosses a board (structural: spine text x is outside the board's max extent) | unit (source-contract) | `npx vitest run components/setup/rack-source.test.ts` | Wave 0 |
| R5 | Hover rack: moving the mouse along turns boards; rest finishes the nearest; caption under the turned board; click opens | e2e (desktop) on `/test-rack` | `npx playwright test e2e/board-rack.spec.ts --project=desktop` | Wave 0 |
| R6 | Swipe rack: scroller snaps one board to the middle; boards turn as they pass; Shape a New Board visible on the first screen at 390x664 with 15 boards | e2e (iphone WebKit + android) | `npx playwright test e2e/board-rack-phone.spec.ts --project=iphone --project=android` | Wave 0 |
| R7 | Heading reads "Board Rack" with the count; hint text per rack kind | e2e + unit (`rackHintText(kind, count)`) | as above | Wave 0 |
| R8 | Pure: `moveInOrder`, `insertAfter`, `insertFirst`, `applyStoredOrder` (null = automatic; listed order; unknown ids skipped; unlisted first; duplicate ids ignored; never mutates input); `parseRackOrderInput` strict; `parseRackOrderColumn` never throws | unit | `npx vitest run lib/models/rack-order.test.ts` | extend existing |
| R8 | Mouse drag moves a board (incl. into another row with 30 boards); Alt+arrow; menu Move left / Move right; touch hold-and-drag on android via CDP `Input.dispatchTouchEvent` (touchStart, wait 500 ms, touchMove steps, touchEnd) | e2e | `npx playwright test e2e/board-rack.spec.ts e2e/board-rack-phone.spec.ts` | Wave 0 |
| R8 | Pure gesture reducers: hold fires at 420 ms unmoved; moving over 8 before it fires cancels to swipe; edge scroll delta; unsaved board refuses to lift | unit (fake timers) | `npx vitest run lib/models/rack-gesture.test.ts` | Wave 0 |
| R8 | `saveRackOrder` is guarded: auth before db, no owner param, scoped statements, exports exactly `["saveRackOrder"]` | unit (source-contract) | `npx vitest run lib/db/ownership.test.ts` | extend existing |
| R8 | Order survives reload and shows on another device | manual UAT on the dev branch + live walk (e2e is signed out, no DB) | n/a | UAT item |
| R9 | In-progress entry is first in every merge; `moveInOrder` never yields an index in front of it; unsaved board refuses to lift and shows the message | unit + e2e | as above | Wave 0 |
| D-11 | `movesOffered(kind, holdEnabled)` matrix: hover always; swipe only when hold is off | unit | `npx vitest run components/setup/rack-config.test.ts` | Wave 0 |
| D-04 | Rack kind is read only from `useCoarsePointer()`, never from width (source-contract) | unit | `npx vitest run components/setup/rack-source.test.ts` | Wave 0 |
| Rule 2 | Height-line labels every foot / every 50 cm; no `25.4`, `304.8` literal in the new files | unit | `npx vitest run lib/geometry/rack-layout.test.ts lib/units-isolation.test.ts` | Wave 0 / existing |
| WR-05 | A board whose art can't be built is dropped by `rackModelsFromRows`, logged by id, others kept | unit | `npx vitest run lib/models/rack-models.test.ts` | extend existing |
| R10 | `scripts/check-saved-boards.ts --rack-report` on dev prints counts and exits 0; `check-preference-columns.ts` shows `rack_order text` | script (dev, then production by the founder) | `npx --no-install tsx scripts/check-saved-boards.ts --rack-report` | Wave 0 |
| Old Safari | Buttons keep their layout under old Safari's `flex-start` rule on the rack's buttons | e2e | `npx playwright test e2e/old-safari-buttons.spec.ts` | update existing |
| Keyboard | Arrow keys walk the rack, Enter opens, Alt+arrow moves, an `aria-live` line says "Moved {name}. The rack keeps your order." | e2e (desktop) | `npx playwright test e2e/board-rack.spec.ts` | Wave 0 |
| Reduced motion | With `reducedMotion: "reduce"` a board swaps to its outline with no eased frames | e2e (`test.use({ reducedMotion: "reduce" })`) | as above | Wave 0 |

### Sampling Rate
- **Per task commit:** the quick command above (a few seconds; the files I ran took 2.3 s for 110 tests).
- **Per wave merge:** `npm test` plus the new Playwright specs on the three projects. Run the full e2e suite detached on main after every wave (project memory: full Playwright on main after every wave; PW_PORT per parallel executor; another project's Playwright may hold port 3100).
- **Phase gate:** `npm test`, `npm run lint`, `npm run build` (from the main checkout), full `npm run test:e2e` green before `/gsd-verify-work`; then the device walk.

### Wave 0 Gaps
- [ ] `lib/geometry/rack-art.test.ts` — covers R1, R3
- [ ] `lib/geometry/rack-layout.test.ts` — covers R2, Rule 2
- [ ] `lib/models/rack-gesture.test.ts` — covers R8, R9
- [ ] extend `lib/models/rack-order.test.ts`, `lib/models/rack-models.test.ts`, `lib/db/ownership.test.ts`
- [ ] `components/setup/rack-config.test.ts`, `components/setup/rack-source.test.ts` (source-contract tests in the `lib/theme.test.ts` idiom)
- [ ] `app/test-rack/page.tsx` + `lib/models/rack-stand-in.ts` + `SHAPER_RACK_STAND_IN` in `playwright.config.ts` `webServer.env`; a prod-build spec `e2e/prod/` proving the route 404s in production, like `e2e/prod/error-pages.spec.ts`
- [ ] `e2e/board-rack.spec.ts`, `e2e/board-rack-phone.spec.ts`
- [ ] Update `e2e/phone-home.spec.ts`, `e2e/phone-trip.spec.ts`, `e2e/old-safari-buttons.spec.ts`
- [ ] Framework install: none.

## Security Domain

`security_enforcement` is enabled (absent or true) and ASVS level 1 per `.planning/config.json`. [VERIFIED: config.json `"security_enforcement": true, "security_asvs_level": 1`]

### Applicable ASVS Categories

| ASVS Category | Applies | Standard Control |
|---------------|---------|-----------------|
| V2 Authentication | no change | Clerk, untouched |
| V3 Session Management | no change | Clerk, untouched |
| V4 Access Control | **yes** | `saveRackOrder` takes the owner only from `await auth()`; the id list is filtered to the caller's own `models` rows; `ownership.test.ts` extended so the new action is mechanically guarded |
| V5 Input Validation | **yes** | `parseRackOrderInput` all-or-nothing: array, each item a string of a bounded length, no repeats, bounded count; reads go through `parseRackOrderColumn` (never throws) |
| V6 Cryptography | no | none |

### Known Threat Patterns for this stack

| Pattern | STRIDE | Standard Mitigation |
|---------|--------|---------------------|
| IDOR: writing another shaper's board ids into your list | Tampering / Information disclosure | Filter to ids returned by a `models` select scoped by `eq(models.clerkUserId, userId)`; the read side only ever merges against the caller's own rows, so a foreign id can't surface a foreign board |
| Oversized or malformed list (storage abuse) | Denial of service | Strict input parser with a count and per-id length cap; reject, don't truncate |
| A test stand-in route reaching production | Elevation of privilege | Gate on the literal `process.env.NODE_ENV` plus `SHAPER_RACK_STAND_IN === "1"`, flag only in `playwright.config.ts`; prod-build spec proves it 404s |
| Report script leaking identity | Information disclosure | Print counts and board ids only, never names, snapshots, user ids or connection strings (existing script convention) |
| Stale order write after a board is deleted elsewhere | Tampering (benign) | Merge skips ids with no board; next write prunes |

## Answers to the lettered questions

### A. Where to store the order
**Recommendation: one nullable text column `rack_order` on `user_preferences`**, JSON text of saved board ids, `null` = not arranged (D-03).

Evidence and edge cases:
- **D-01 (new board first):** `saveModel` insert branch writes `insertFirst` when the list is non-null; if that write fails the merge still puts an unlisted board first. [VERIFIED: actions.ts:67-73]
- **D-02 (duplicate after original):** `duplicateModel` hook writes `insertAfter` when the list is non-null (actions.ts:161-165 is where the insert returns the new id).
- **D-03 (automatic until first move):** `null` falls out; `sortRackEntries` is the null path (rack-order.ts:49-64, unchanged).
- **Delete:** no write; merge skips ids with no row; the next move prunes.
- **Two devices:** whole-list upsert, last write wins; a board the other device created is missing from the list and goes first (D-01); an id with no board is skipped. Never corrupt: the list is only ever read through the merge.
- **Autosave touching `updatedAt`:** irrelevant once a list exists; `listModels` still returns `desc(updatedAt)` and the merge ignores that order for listed boards. [VERIFIED: queries.ts:42-52]
- **Account deletion:** unchanged (row already deleted whole). [VERIFIED: account-deletion.ts:30-37]
- **Why not per-board `position`:** N writes per move (no interactive transactions on `neon-http`, only `batch`, per the account-deletion.ts header), `null` is ambiguous per row, and `saveModel`'s insert would still name the new column so the migrate-first rule applies anyway.
- **Schema, migration, test impact:** see Pattern 1 (exact line, `--name`, `db:generate` / `db:migrate` / `db:migrate:prod`, `check-preference-columns.ts` update). No existing test asserts `user_preferences` columns.

### B. How the order flows
1. **Read:** in `BoardRackData`, next to `listModels`, `readRackOrder(userId)` in `lib/db/queries.ts` (one select of the one column, scoped by `eq(userPreferences.clerkUserId, clerkId)`, parsed by `parseRackOrderColumn`), in its own try/catch → `null`. Pass `rackOrder` as a prop to `SetupScreen` (also add it to the Suspense fallback call as `null`).
2. **Merge:** `SetupScreen`'s `rackEntries` memo (setup-screen.tsx:46-69) swaps `sortRackEntries(entries)` for `applyStoredOrder(entries, effectiveOrder)`; the in-progress rule `hasBoardInProgress && modelId === null` (line 60) is kept as is.
3. **Save a move:** client calls `saveRackOrder(ids)`; ids are the saved entries in their new order (no in-progress). Optimistic: set `localOrder` first, call the action, on failure show a small non-blocking line and keep the local order (the next successful move rewrites the whole list).
4. **Hooks:** D-01 and D-02 as in Pattern 4. Rename, Duplicate, Delete call sites stay in `board-rack.tsx` (lines 61-86) and get the same `insertAfter` applied locally after `duplicateModel` returns.

### C. Computing each board's profile + outline
- `summarizeDesign` does **not** expose the profile (it returns four numbers, design.ts:141-147, 237-242). Propose `designSideProfile(fields, rules)` beside it (Pattern 5).
- **Where:** on the **client** once per `models` change in a `useMemo` (snapshots are already in the props because opening a board needs them). The server runs the same builder inside `rackModelsFromRows`' try block only to validate and drop (keeps WR-05, rack-models.ts:43-52), discarding the result.
- **Cost (measured here, Node, warm):** `summarizeDesign` about 1.50 ms per board; profile + outline + 65 `rockerAt`/`deckAt` samples about 0.25 ms per board. So 30 boards is about 8 ms for the art. Today's rack already pays `summarizeDesign` twice per board (rack-models.ts:46 on the server and board-rack-card.tsx:149 on every render of every card); the new rack should compute summaries once per list change.
- **Sampling:** 65 points, `s = L * i / 64`, mm, `half = sampleOutline(geometry, s)`; keep `geometry.points` (161 points per outline, outline.ts doc) for the exact silhouette. A hand-set board has `profile.blank === null` and works unchanged.
- **In-progress board:** use the store's `sideProfile` and `outlineGeometry` directly.

### D. The turn maths as pure functions with tests
Functions (all in `lib/geometry/rack-art.ts` unless noted): `buildRackBoardArt(profile, geometry, steps = 64)` returning `{ length, stations, rocker, deck, half, tMid, maxDeck, maxHalf }` plus the shared silhouette from `screen-tiles`; `turnedBoardPoints(art, theta)` → `{ left, right }` in mm relative to the board's axis; `turnedBoardPath(art, theta, scale, cx, floorY)` (polygon, with the `theta >= 1.5620` silhouette branch); `stringerPoints(art, theta)`; `halfExtent(art, theta, scale)`; in `rack-layout.ts`: `rackScale`, `rackRows`, `slotPosition`, `slotAt`, `rackHeightMarks(system, maxMm, scale)`, `phoneRackHeight`, `turnFraction(distance, reach)`, `roomAround(...)`.

Test strategy (Rule 1, no hand-typed expectations):
1. **theta = 0:** for every station `left_i === rockerAt(s_i) - tMid` and `right_i === deckAt(s_i) - tMid` (derived from the formula: xc - ext with cos = 1, sin = 0), where the board comes from the app's own pipeline (`presetBoard` in screen-tiles.test.ts) for each of the four presets and a hand-set board. Also check bottom/deck pairs equal the exported `sidePoints` samples at the same stations.
2. **theta = pi/2:** the returned point list **equals** `silhouette(geometry)` mapped by scale (tail-to-nose right half, left half reversed, the close point). On the fish preset (the swallow, presets.ts:277 `tail: { kind: "swallow", endWidth: inchesToMm(10), crotchDepth: inchesToMm(2.75) }`) assert the last point has `station === geometry.centreCloseStation`. For theta just below the switch, assert `|ext_i - half_i| <= (d_i - r_i)/2 * cos(theta)` (a bound derived from `sqrt(a^2 + b^2) - b <= a`).
3. **Stringer:** for a sweep of angles, `left_i <= stringer_i <= right_i` at every station; at 0 it equals `right_i`; at pi/2 it is 0 within 1e-9. (It is a point on the cross-section ellipse, so the projection must lie in the span.)
4. **Half-extent:** only the endpoint identities (`halfExtent(0) = maxDeck*scale/2`, `halfExtent(pi/2) = maxHalf*scale`). Do **not** assert it bounds the drawn path: with a non-zero centre offset the exact extent can exceed it slightly; it is a spacing figure (sketch use only).
5. **Layout:** invariants (one scale across rows; `cap * P + labelsW + reserve <= CW`; rows balanced, `max - min per row <= 1`; every board in exactly one slot; `slotAt(slotPosition(k)) === k`); height marks every `inchesToMm(12)` from 4 ft and every `centimetresToMm(50)` from 150 cm, labels through the units functions.
6. **Frozen vs live:** use `BOARD_PRESETS` for live-invariant tests (like screen-tiles.test.ts), and `__fixtures__/pinned-preset-outlines.ts` only if a value is pinned.

### E. Pointer detection (D-04)
Use `useCoarsePointer()` from `components/design/use-viewer-media.ts:56-58` (media query `(pointer: coarse)`, server snapshot false, `useSyncExternalStore`, listens for `change`). It matches the existing `coarse:` Tailwind variant (globals.css:82) and `app-settings-dialog.tsx:185`'s direct read. Pre-hydration: render the heading and a reserved well only (Pitfall 4). iPad Safari: reports coarse always (Pitfall 3, cited). Touch laptops: fine primary pointer → hover rack; D-05 handled per event: `onPointerUp` with `pointerType === "touch"` and the board not yet turned → turn and show the caption without opening; the same board again opens; `mouse`/`pen` opens at once. Mouse/pen only may start a drag on the hover rack.
**Three-switch rule:** width picks the layout, the pointer picks the sizing **and now which rack**, height picks short-screen behaviour. CLAUDE.md Layout section needs the one sentence D-04 requires, and `use-viewer-media.ts`'s header ("nobody should reach for either hook below to move a layout") stays true because the rack choice changes a behaviour, not the page layout. Add a source-contract test that the rack kind is read only from `useCoarsePointer`. The compiled-CSS guard (`shell-variant.css.test.ts`) is unaffected: no CSS switch changes.

### F. Gestures on older Safari
- **Swipe rack:** `overflow-x: auto; overflow-y: hidden; scroll-snap-type: x mandatory; overscroll-behavior-x: contain; touch-action: pan-x pan-y; scrollbar-width: none` plus `::-webkit-scrollbar { display: none }` for Safari, `-webkit-user-select: none; -webkit-touch-callout: none` (CSS block in `board-rack.md:94-99`; `-webkit-overflow-scrolling: touch` appears in the 011 sketch and is harmless). One scroll listener, `{ passive: true }`, that only schedules a `requestAnimationFrame`; the frame reads `scrollLeft`, computes each board's distance from the middle and writes attributes. Settled = a timer about 120-180 ms after the last scroll event (no `scrollend`). Padding so the first and last boards can reach the middle: `padL = padR = (width - slot) / 2`, as an element, not CSS padding on a clipped scroller (project memory: WebKit reads an empty-content-box scroller as fully clipped).
- **Hold-and-drag:** Pitfall 1 recipe. Pointer events are available on iOS 13+; read position from the pointer event, not touch events; cancel the hold timer on `pointermove` over 8 dots, `pointerup`, `pointercancel` and `contextmenu`; after lift, `touchmove.preventDefault()` from a listener registered once at mount; carry the board by pointer position plus `scrollLeft` (sketch `drag.boardX = drag.x + sc.scrollLeft - drag.offX`); edge scroll zone 46 dots scrolling `scrollLeft` per frame. Because assigning `scrollLeft` during a drag fights scroll-snap, set `scroll-snap-type: none` while carrying and restore on drop, then `scrollLeft = nearestSlot * slot` (Pitfall 5) [ASSUMED mitigation; the sketch only ran in Chromium].
- **Desktop drag:** pointer events on the single SVG, `setPointerCapture`, 6-dot threshold, mouse and pen only, `touch-action: pan-y` on the SVG (not `none`), `cursor: grabbing` while dragging.
- **Reduced motion:** `useReducedMotion()` (new); no easing, no slide, instant drop.
- **Old-Safari button rule:** the base-layer `button { align-items: normal; }` is in place (globals.css, "Old Safari" block ~811-828, `e2e/old-safari-buttons.spec.ts`); rack buttons that are flex columns must not rely on default alignment, and the existing old-safari spec must be updated to cover the new buttons.
- **Keyboard / screen readers:** make each board a real focusable element (roving tabindex; arrows walk, Enter opens, Alt+arrow moves, Home/End) rather than the sketch's single focusable SVG; an `aria-live="polite"` region carries "Moved {name}. The rack keeps your order."; the unsaved board announces that it stays first.

### G. Tests that will break or need updating
- `e2e/phone-home.spec.ts:116` and `:233` — `getByRole("heading", { name: "Your Boards" })`; `:222-250` — compares the in-progress card's box x/width to a preset card's (`rackBox.x toBeCloseTo presetBox.x`); needs rewriting for the rack (e.g. the section spans the content width, heading is one line).
- `e2e/phone-trip.spec.ts:108-110` — "Your Boards" heading and `Continue This Board` button.
- `e2e/old-safari-buttons.spec.ts:122-129` — `boardPictureWidths(page, "Continue This Board")` expects the card's first child `div` picture to span the card (`card.locator(":scope > div").first()`); that structure disappears.
- `.planning/phases/13-ready-for-the-shapers/13-UAT.md:182` (test 12) says "open the board from Your Boards" and the printed walk sheet gains the rack (D-14).
- Specs that return home with a board in progress and may be sensitive to the new height or the focusable set: `e2e/phone-screen-tiles.spec.ts:243`, `e2e/phone-sideways-top-bar.spec.ts:274`, `e2e/phone-dialogs.spec.ts:104`, `e2e/step-nav.spec.ts:200`, `e2e/phone-setup-landscape.spec.ts` (preset cards only; probably fine), `e2e/keyboard-focus.spec.ts` (Tab counts on design screens, not home). Run the whole suite and read each failure.
- **Desktop baseline screenshots:** `e2e/desktop-baseline.spec.ts-snapshots/` holds only outline, rocker, rails, fins, volume (five PNGs). The home page has no baseline, so none is affected. [VERIFIED: `ls` of that folder this session]
- Unit: `lib/models/rack-order.test.ts` and `rack-models.test.ts` extend (not break); `lib/db/ownership.test.ts` extends; `lib/units-isolation.test.ts` unaffected as long as `card-metadata-line.tsx` and `preset-card.tsx` remain (Pitfall 9). Baseline: the 8 test files I ran (rack-order, rack-models, screen-tiles, `lib/db`, units-isolation) passed 110 of 110.
- **How Playwright exercises the new things:** hover and mouse drag: `page.mouse.move/down/up` with `steps`; keyboard: `page.keyboard.press("Alt+ArrowRight")`; swipe and hold on the `android` project through CDP `Input.dispatchTouchEvent` (recipe at `e2e/slider-touch.spec.ts:77-105`, Chromium-only; the file `touch-drag.spec.ts` header explains why synthetic events are not enough); the `iphone` project (WebKit) can load the page and check layout and the `touchscreen.tap` path, but cannot drag. Saved boards need the `/test-rack` stand-in (Pattern 8). The iPhone profile is 390x664 so the "Shape a New Board on the first screen with 15 boards" check runs there.

### H. D-13 read-only report
The pattern is `scripts/check-saved-boards.ts` (Phase 12, extended in Phase 14 with `--curves-report` and `--tips-report`): one `select`, never a snapshot/name/user id/connection string, own env loading via `CHECK_ENV_FILE`, relative dynamic imports after the env file loads, fixed-sentence failure output, run by the founder with the documented `npx vercel env pull ... CHECK_ENV_FILE=.env.production.pull npx --no-install tsx scripts/check-saved-boards.ts --<flag>` recipe in its header (lines 41-49). [VERIFIED: file read this session]

Add `--rack-report`:
- Select `id`, `clerk_user_id` (for counts only, never printed) and `snapshot`.
- For each row run exactly what the page runs: `rackModelsFromRows` semantics (parse, `summarizeDesign`, **and** the new rack-art build with an all-finite-numbers check); collect dropped ids (give `rackModelsFromRows` a variant returning `{ models, dropped }` so the script and the page share one code path).
- Print: `saved boards: N; rack can draw: k of N`; `accounts with saved boards: A; boards per account: n1, n2, ...` (sorted, anonymous, see A6); `accounts with an arranged order: 0` (a read of `rack_order`, only after the column exists); one line `boards the rack would drop: id, id` (ids only). Exit code 1 only when a board is dropped that **opens today** (so the rack makes none worse).
- Also the founder runs `check-preference-columns.ts` (now 5 of 5 columns) after `db:migrate:prod`.

### I. Risks and wave order
**Risks (one-day build, Wednesday go-live):**
1. Hold-and-drag on real iOS (A4, Pitfall 1): decide early; D-11 switch prepared.
2. The sketch engine is imperative DOM (innerHTML + per-frame attributes). The port to React must keep the frame loop imperative (Pattern 7); a naive state-per-frame port will stutter.
3. Saved boards can't be seen by Playwright without the stand-in (Pattern 8); build it in wave 2 so every later wave has tests.
4. Layout is measured in the browser: SSR flash and CLS (Pitfall 4); phone height depends on the scroller (Pitfall 6).
5. Migration order: production before the push (Database rule), founder's terminal; reading must be fail-soft.
6. Existing e2e updates are easy to forget (Q G).
7. Real-device walk (D-14) and the print walk sheet update need time before the Wednesday freeze.

**Suggested waves (tracer-first):**
- **Wave 0 (foundation, parallel-safe):** schema + `generate --name rack_order` + `db:migrate` on dev + `check-preference-columns.ts` update; pure order functions + tests; `designSideProfile` extraction; export `silhouette`/`sidePoints`; `rack-art.ts`, `rack-layout.ts` + tests (R1-R3, R8 pure).
- **Wave 1 (tracer):** read the order in `BoardRackData`; new `BoardRack` section (heading "Board Rack", count, hint); hover rack, read-only, on real data: side profiles at rest, turn follows the cursor, caption with Open / ⋯ (Rename, Duplicate, Delete unchanged), unsaved board pinned; `/test-rack` stand-in; update the three e2e specs. This is the first thing the founder can look at.
- **Wave 2:** swipe rack (scroller, turn on pass, caption, phone height, D-07 start, D-06 short screen); `useCoarsePointer` switch; reduced motion; keyboard and aria-live.
- **Wave 3:** reorder on the hover rack (drag with gap mark, Alt+arrow, ⋯ Move left/right), `saveRackOrder`, hooks in `saveModel` / `duplicateModel`, ownership tests.
- **Wave 4:** hold-and-drag on touch behind `TOUCH_HOLD_TO_MOVE`; put a dev build in front of the founder's iPad immediately and decide D-11.
- **Wave 5:** `--rack-report` (D-13), CLAUDE.md pointer sentence (D-04), 13-UAT.md wording and walk sheet text (D-14), code review, full e2e + build + lint, then (founder present) `npm run db:migrate:prod`, report on production, push on the founder's go, live check, rehearsal walk.

## Project Constraints (from CLAUDE.md)

- **Rule 1:** geometry math in `lib/geometry/`, pure, no React/browser/DB imports, every exported function tested, expected values from the app's own functions or generated fixtures, never hand-typed.
- **Rule 2:** every conversion of a design value through `lib/geometry/units.ts`; do not use 25.4 or 10 elsewhere; Metric dims one decimal in cm, marks whole mm; height lines every foot (Imperial) / every 50 cm (Metric); storage stays metric.
- **Database:** additive nullable column → migrate **production before** the code ships; development branch migrated during the work; never hand-edit `.env.local`; removals wait for the deploy.
- **Layout:** width picks layout, pointer picks sizing (now also hover vs swipe rack, with one added sentence in CLAUDE.md), height picks short-screen behaviour (written inline as `[@media(max-height:500px)]`); never conflate. Phone chrome tightened under both rules, never a third.
- **Phone real estate is expensive**; users are shapers and surfers, so explain changes in plain English (commits and summaries too).
- **Next.js 16 (AGENTS.md):** read `node_modules/next/dist/docs/` before code; the relevant pages checked here are `revalidatePath.md` and `07-mutating-data.md`.
- **GSD workflow:** edits go through a GSD command; nothing pushed without the founder's go; no scratch `.ts/.cjs` loose under `.planning/` (archive as tar.gz); no new package; one change per quick task cadence from project memory.
- `npm run build` from the main checkout (Turbopack won't resolve `next` in a worktree); `npx next typegen` in fresh worktrees.

## Sources

### Primary (HIGH confidence): read or run in this session
- `/Users/kontoes/Code/shaper/.planning/phases/15-the-board-rack/15-CONTEXT.md`, `15-SPEC.md`
- `.claude/skills/sketch-findings-shaper/SKILL.md`, `references/board-rack.md`; `.planning/sketches/010-sideways-board-rack/README.md`, `011-phone-rack-reorder/README.md`; the extracted sketch sources (`010-engine.js`, `010-template.html`, `quiver-data.ts`, `011-template.html`) from the `sketch-source.tar.gz` files
- `lib/db/schema.ts`, `lib/db/queries.ts`, `lib/db/ownership.test.ts`, `lib/db/account-deletion.ts` + test, `app/actions/units.ts`, `app/actions/blank-makers.ts`, `app/design/actions.ts`, `app/page.tsx`, `lib/models/rack-order.ts` + test, `lib/models/rack-models.ts` + test, `lib/geometry/design.ts`, `board-profile.ts`, `outline.ts`, `screen-tiles.ts` + test, `summary-line.ts`, `components/setup/*`, `components/design/use-viewer-media.ts`, `components/design/design-store.tsx`, `app/globals.css`, `lib/blank-makers-preference.ts`, `lib/blank-makers-server.ts`, `lib/error-pages/forced-error.ts`, `app/test-error/page.tsx`, `scripts/check-saved-boards.ts`, `scripts/check-preference-columns.ts`, `drizzle/0007_*.sql`, `drizzle.config.ts`, `package.json`, `playwright.config.ts`, `playwright.prod.config.ts`, `vitest.config.ts`, `.planning/config.json`, e2e specs named in Q G
- `node_modules/next/dist/docs/01-app/03-api-reference/04-functions/revalidatePath.md`, `01-app/01-getting-started/07-mutating-data.md:207`
- Commands run: scratch benchmark (`summarizeDesign` 1.50 ms/board; profile + outline + 65 samples 0.25 ms/board), `drizzle-kit generate --help`, Playwright device descriptors (iPhone 14 390x664 webkit; Pixel 7 412x839 chromium), `vitest run` on eight rack-adjacent files (110 passed)

### Secondary (MEDIUM confidence): web search, not re-run on a device
- WebKit bug 184250 / 184251 (touchmove becomes non-cancelable once scrolling has started): https://bugs.webkit.org/show_bug.cgi?id=184250 , https://bugs.webkit.org/show_bug.cgi?id=184251
- WebKit bug 209292 (iPad Safari pointer/hover media queries always coarse/none): https://bugs.webkit.org/show_bug.cgi?id=209292
- WebKit bug 160622 (scroll snap may not happen when scrollLeft is set programmatically): https://bugs.webkit.org/show_bug.cgi?id=160622
- Safari 26.2 adds `scrollend`: https://www.infoq.com/news/2026/04/safari-scrollend-support

### Tertiary (LOW confidence)
- None used as a basis for a recommendation without a flag (A2, A3, A4 are tagged assumptions above).

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH — no new packages; everything read from package.json and the repo.
- Architecture (order, data flow, maths, tests): HIGH — each claim traced to a file read this session, with a local benchmark for cost.
- Pitfalls on real Safari hardware: MEDIUM — sourced from WebKit bug reports and the sketch READMEs; the hold-and-drag path has never run on a real iPad.

**Research date:** 2026-10-05
**Valid until:** 2026-10-07 evening (the freeze); the repo-derived findings hold until the code changes, the iOS findings until a device run.

## RESEARCH COMPLETE
