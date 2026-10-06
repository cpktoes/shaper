# Phase 15: The Board Rack - Pattern Map

**Mapped:** 2026-10-05
**Files analyzed:** 27 new or modified (grouped below)
**Analogs found:** 24 / 27 (3 have no analog: the imperative frame loop, the gesture reducers' DOM wiring, the swipe scroller)

All analogs below were opened and verified this session. Line numbers are from the current branch (`board-rack`).
Corrections to the research are flagged **CORRECTION**.

## File Classification

| New/Modified File | Role | Data Flow | Closest Analog | Match Quality |
|---|---|---|---|---|
| `lib/geometry/rack-art.ts` (new) | utility (pure geometry) | transform | `lib/geometry/screen-tiles.ts` | role+flow exact |
| `lib/geometry/rack-art.test.ts` (new) | test | transform | `lib/geometry/screen-tiles.test.ts` (`presetBoard`, lines 34-83) | exact |
| `lib/geometry/rack-layout.ts` (new) | utility (pure layout) | transform | `lib/geometry/screen-tiles.ts` (`meetScale`, `padBox`) | role-match |
| `lib/geometry/rack-layout.test.ts` (new) | test | transform | `lib/geometry/screen-tiles.test.ts` | role-match |
| `lib/geometry/screen-tiles.ts` (modify: export `silhouette`, `sidePoints`) | utility | transform | itself | n/a |
| `lib/geometry/design.ts` (modify: add `designSideProfile`) | utility | transform | `summarizeDesignWith`, lines 199-221 | exact (extraction) |
| `lib/models/rack-order.ts` (modify) | utility (pure order rule) | transform | itself + `lib/blank-makers-preference.ts` (column parse/serialise/strict input) | exact |
| `lib/models/rack-order.test.ts` (extend) | test | transform | existing file | exact |
| `lib/models/rack-models.ts` (modify: build art inside the try, report `dropped`) | utility | transform | itself, lines 38-53 | exact |
| `lib/models/rack-models.test.ts` (extend) | test | transform | existing, lines 1-50 | exact |
| `lib/models/rack-gesture.ts` (+ test) (new) | utility (pure reducers) | event-driven | `lib/models/rack-order.ts` (pure-module register) | partial |
| `lib/models/rack-stand-in.ts` (new) | utility (test fixture) | transform | `screen-tiles.test.ts` `presetBoard` + `lib/models/rack-models.test.ts` `row()` helper | role-match |
| `lib/db/schema.ts` (modify: `rackOrder`) | model | CRUD | `hiddenBlankMakers`, line 97 | exact |
| `drizzle/0009_rack_order.sql` + `meta/` (new, generated) | migration | CRUD | `drizzle/0007_hidden_blank_makers.sql` | exact |
| `lib/db/queries.ts` (modify: `readRackOrder`) | service (read) | request-response | `readBlankMakersPreference`, lines 136-141 | exact |
| `app/actions/rack-order.ts` (new) | controller (Server Action) | CRUD | `app/actions/blank-makers.ts` | exact |
| `lib/db/ownership.test.ts` (extend) | test (source-contract) | n/a | itself, lines 13-21, 72-79, 94-102, 135-149 | exact |
| `app/design/actions.ts` (modify: D-01 / D-02 / D-16 hooks) | controller | CRUD | itself, `saveModel` insert (line 67-73), `duplicateModel` (143-166) | exact |
| `app/page.tsx` (modify: read order, pass prop) | route (Server Component) | request-response | itself, `BoardRackData` | exact |
| `components/setup/setup-screen.tsx` (modify: `rackOrder` prop, `applyStoredOrder`) | component | request-response | itself, lines 46-69 | exact |
| `components/setup/board-rack.tsx` (rewrite) | component | event-driven | itself (dialog state, lines 42-86, 112-131) | role-match |
| `components/setup/hover-rack.tsx`, `swipe-rack.tsx`, `rack-board.tsx`, `rack-caption.tsx` (new) | component | event-driven / streaming frame loop | `board-rack-card.tsx` (caption text), `components/design/use-viewer-media.ts` | partial / none for the loop |
| `components/setup/rack-card-menu.tsx` (modify: Move left / right) | component | event-driven | itself | exact |
| `components/setup/rack-config.ts` (+ test) (new) | config | n/a | `lib/error-pages/forced-error.ts` (tiny pure switch module) | role-match |
| `components/design/use-viewer-media.ts` (modify: `useReducedMotion`) | hook | event-driven | itself, lines 39-58 | exact |
| `app/test-rack/page.tsx` (new) | route (test-only) | request-response | `app/test-error/page.tsx` | exact |
| `lib/models/rack-stand-in-gate` (or in `rack-stand-in.ts`) | utility | n/a | `lib/error-pages/forced-error.ts` | exact |
| `playwright.config.ts` (modify: env flag) | config | n/a | `SHAPER_FORCED_ERROR` block | exact |
| `e2e/prod/` rack-route-404 spec (new) | test | request-response | `e2e/prod/error-pages.spec.ts` lines 25-39 | exact |
| `e2e/board-rack.spec.ts`, `e2e/board-rack-phone.spec.ts` (new) | test | event-driven | `e2e/slider-touch.spec.ts` (CDP touch) | role-match |
| `scripts/check-saved-boards.ts` (modify: `--rack-report`) | script | batch | itself, `--curves-report` / `--tips-report` | exact |
| `scripts/check-preference-columns.ts` (modify) | script | batch | itself, `NEW_COLUMNS` lines 63-68 | exact |
| `lib/theme.test.ts`-style `components/setup/rack-source.test.ts` (new) | test (source-contract) | n/a | `lib/theme.test.ts` lines 1-80, `lib/db/ownership.test.ts` | exact |
| `CLAUDE.md` (modify: one sentence in Layout) | docs | n/a | CLAUDE.md "Control size - pointer alone" paragraph | exact |

## Pattern Assignments

### `lib/geometry/rack-art.ts` (utility, transform)

**Analog:** `lib/geometry/screen-tiles.ts` (header, pure-file rule, silhouette, side points)

**Header and purity contract** (lines 1-22): doc comment states "Pure, like everything under `lib/geometry/` (CLAUDE.md Rule 1): no React, browser or database imports". Imports are relative inside `lib/geometry/`:
```typescript
import type { OutlineSpec, Point2D } from "./board";
import type { BoardSideProfile } from "./board-profile";
import type { OutlineGeometry } from "./outline";
import { type Litres, type Mm, type UnitsSystem, mm } from "./units";
```

**TEMPLATE silhouette (the rack's 90 degree frame must BE this)** (lines 81-91). **CORRECTION: the research cites lines 81-91 and 116-125 for private `silhouette`/`sidePoints`; they are actually `silhouette` at lines 84-91 and `sidePoints` at lines 116-125. Both are un-exported; the plan must add `export`.**
```typescript
function silhouette(geometry: OutlineGeometry): { station: number; w: number }[] {
  const right = geometry.points.map((p) => ({ station: p.station, w: p.halfWidth }));
  const left = geometry.points
    .slice()
    .reverse()
    .map((p) => ({ station: p.station, w: -p.halfWidth }));
  return [...right, ...left, { station: geometry.centreCloseStation, w: 0 }];
}
```

**Side points sampler** (lines 116-125), the theta=0 frame the test compares against:
```typescript
function sidePoints(start: number, end: number, steps: number, bottomAt: (s: Mm) => Mm, deckAt: (s: Mm) => Mm): XY[] {
  const bottom: XY[] = [];
  const deck: XY[] = [];
  for (let i = 0; i <= steps; i++) {
    const station = mm(start + ((end - start) * i) / steps);
    bottom.push({ x: -station, y: -bottomAt(station) });
    deck.push({ x: -station, y: -deckAt(station) });
  }
  return [...bottom, ...deck.reverse()];
}
```

**Path writer to reuse** (lines 70-75): `polylinePath(points, closed)` writes `M x y L x y ... Z` with 2 decimals; also reuse `boxOfPoints`, `padBox`, `meetScale` (lines 38-67).

**Formula to port** (from RESEARCH Pattern 6, sketch `references/board-rack.md:72-84`): 65 stations `s = L*i/64`; `xc = ((r+d)/2 - tMid)*cos`; `ext = sqrt(((d-r)/2)^2*cos^2 + h^2*sin^2)`; stringer `x = (d - tMid)*cos`; `theta >= 1.5620` draws `silhouette(geometry)`.

---

### `lib/geometry/rack-art.test.ts` / `rack-layout.test.ts` (test, transform)

**Analog:** `lib/geometry/screen-tiles.test.ts` `presetBoard` (lines 34-83). Build inputs from the app's own pipeline, never hand-typed (Rule 1):
```typescript
function presetBoard(preset: BoardPreset) {
  const fields = presetDesignFields(preset);
  const outline = buildOutline(fields.outline);
  const sideProfile = buildBoardProfile({
    length: fields.outline.length,
    rocker: fields.rocker,
    foil: fields.foil,
    blank: {
      prepared: prepareBlank(fields.blank.copy),
      placement: fields.blank.placement,
      nose12Offset: fields.blank.nose12Offset,
      tail12Offset: fields.blank.tail12Offset,
      deckSkin: fields.blank.deckSkin,
      tipStyle: fields.blank.tipStyle,
      fineTuneSurface: fields.blank.fineTuneSurface,
      ...thinningStartsOf(fields.blank),
    },
  });
  // ...rail bands, fins (lines 52-82) are not needed by the rack
```
Copy only the first two statements; once `designSideProfile` exists (below) the rack tests should call it instead of duplicating the recipe. Helpers `pathPoints(d)` (lines 85-96), `span` (103) are reusable by copy. Use `BOARD_PRESETS` for live-invariant tests.

---

### `lib/geometry/design.ts` — add `designSideProfile(fields, rules)` (utility, transform)

**Analog:** `summarizeDesignWith`, lines 199-221. Extract this block verbatim into an exported function and have `summarizeDesignWith` call it:
```typescript
const profile = buildBoardProfile({
  length: fields.outline.length,
  rocker: fields.rocker ?? DEFAULT_FALLBACK_ROCKER,
  foil: fields.foil,
  blank: blank
    ? {
        prepared: rules.prepare(blank.copy),
        placement: blank.placement,
        nose12Offset: blank.nose12Offset,
        tail12Offset: blank.tail12Offset,
        deckSkin: blank.deckSkin,
        tipStyle: blank.tipStyle,
        fineTuneSurface: blank.fineTuneSurface,
        tipRule: rules.tipRule,
        ...thinningStartsOf(blank),
      }
    : null,
  handSetCurve: rules.handSetCurve,
});
```
Guard: `design.test.ts` and the Phase 14 suites already pin `summarizeDesign`.

---

### `lib/models/rack-order.ts` — stored order functions (utility, transform)

**Analog 1 (same file):** `sortRackEntries` (lines 49-64) is the null path; keep generics `T extends RackEntry`, "sorts a copy" rule, descending-id tiebreak. `RackEntry`, `SavedRackEntry`, `InProgressRackEntry` types at lines 21-35.

**Analog 2 for the column text (parse / serialise / strict input):** `lib/blank-makers-preference.ts` lines 55-90:
```typescript
export function parseHiddenBlankMakersColumn(text: string | null | undefined): BlankVendor[] | null {
  if (!text) return null;
  try {
    return parseHiddenBlankMakers(JSON.parse(text));
  } catch {
    return null;
  }
}
export function hiddenBlankMakersColumnValue(hidden: readonly BlankVendor[]): string {
  return JSON.stringify(inCatalogueOrder(hidden));
}
export function parseHiddenBlankMakersInput(value: unknown): BlankVendor[] | null {
  if (!Array.isArray(value)) return null;
  if (value.length > KNOWN_BLANK_VENDORS.length) return null;
  if (!value.every(isKnownBlankVendor)) return null;
  if (new Set(value).size !== value.length) return null;
  ...
}
```
Copy the three-function shape (`parseRackOrderColumn` never throws; `rackOrderColumnValue` = `JSON.stringify`; `parseRackOrderInput` all-or-nothing with a count cap and per-id length cap, no repeats). The "pure, no React/browser/db import" header register (blank-makers-preference.ts lines 1-25) applies. Put `applyStoredOrder`, `moveInOrder`, `insertAfter`, `insertFirst` here (RESEARCH Pattern 2 has the full `applyStoredOrder` body; verified compatible with `RackEntry`).

**Founder ruling D-16 (CONTEXT.md:90-95) overrides RESEARCH Pattern 4 / A5 / Open Question 1:** a duplicate in a still-null rack must store a list. Add a pure helper that takes the current automatic order (the ids from `sortRackEntries` over saved rows) and returns `insertAfter(thatOrder, originalId, copyId)`. RESEARCH's "do nothing when list is null" is superseded.

---

### `lib/models/rack-models.ts` (utility, transform)

**Analog:** itself, lines 38-53. The drop-on-throw structure to extend (build the rack art inside the same `try`, keep the log line text `Shaper: dropped unparsable saved board ${row.id}`):
```typescript
return rows.flatMap((row) => {
  try {
    const snapshot = parseSnapshot(row.snapshot, options);
    summarizeDesign(snapshot);          // add: build outline + designSideProfile + rack art, all-finite check
    return [{ id: row.id, name: row.name, snapshot, updatedAt: row.updatedAt }];
  } catch (error) {
    log(`Shaper: dropped unparsable saved board ${row.id}`, error);
    return [];
  }
});
```
For D-13 the script and the page must share one path: add a variant returning `{ models, dropped }` and have `rackModelsFromRows` call it.

**Test analog:** `lib/models/rack-models.test.ts` lines 15-45: `FIELDS` built from `DEFAULT_*` specs plus `MARKO` seed blank; `row(id, fields)` via `JSON.parse(JSON.stringify(buildSnapshot(fields)))`; crafted 500 mm board dropped; `vi.fn()` log asserted `toHaveBeenCalledTimes(1)` and message contains id.

---

### `lib/db/schema.ts` + migration (model/migration, CRUD)

**Analog:** schema line 97 (precedent comment lines 93-96, in context lines 85-100):
```typescript
// Quick task 260926-wmf: the blank makers a shaper switched OFF ... Null = not chosen ...
hiddenBlankMakers: text("hidden_blank_makers"),
```
Add directly after: `rackOrder: text("rack_order"),` with a comment naming Phase 15 D-03. `drizzle/0007_hidden_blank_makers.sql` is the single line `ALTER TABLE "user_preferences" ADD COLUMN "hidden_blank_makers" text;` and the new one should be the same shape. Generate with `npx drizzle-kit generate --name rack_order` (expected file `drizzle/0009_rack_order.sql`; confirm the next number with `ls drizzle`).

---

### `lib/db/queries.ts` — `readRackOrder` (service, request-response)

**Analog:** `readBlankMakersPreference`, lines 136-141. Same file imports (`eq`, `db`, `userPreferences`, lines 11-13) are already present; add the `parseRackOrderColumn` import beside line 21:
```typescript
export async function readBlankMakersPreference(clerkId: string): Promise<BlankVendor[] | null> {
  const [row] = await db.select({ hiddenBlankMakers: userPreferences.hiddenBlankMakers })
    .from(userPreferences)
    .where(eq(userPreferences.clerkUserId, clerkId));
  return parseHiddenBlankMakersColumn(row?.hiddenBlankMakers ?? null);
}
```
Keep the doc-comment register (lines 123-135: one select, one column, read-only). Owner id comes in as `clerkId` (the ownership test allows `clerkId`; its regex bans `userId|ownerId|clerkUserId` in exported parameter lists, see `ownership.test.ts:104`). **Do not name the parameter `userId`.**

---

### `app/actions/rack-order.ts` (Server Action, CRUD)

**Analog:** `app/actions/blank-makers.ts`, whole file (44 lines). Header comment style (lines 1-12), imports (14-17), body (29-43):
```typescript
"use server";
import { auth } from "@clerk/nextjs/server";
import { db } from "@/lib/db/client";
import { userPreferences } from "@/lib/db/schema";

export async function saveBlankMakersPreference(hidden: readonly string[]): Promise<void> {
  const { userId } = await auth();
  if (!userId) return;
  const parsed = parseHiddenBlankMakersInput(hidden);
  if (parsed === null) return;
  const value = hiddenBlankMakersColumnValue(parsed);
  await db.insert(userPreferences)
    .values({ clerkUserId: userId, hiddenBlankMakers: value })
    .onConflictDoUpdate({
      target: userPreferences.clerkUserId,
      set: { hiddenBlankMakers: value, updatedAt: new Date() },
    });
}
```
Extension for the rack: before the insert, select `models.id` scoped `eq(models.clerkUserId, userId)` and filter the parsed list to own ids (RESEARCH Pattern 3 has the full body). No `revalidatePath`. Only async functions exported from a `"use server"` file; helpers live in `lib/models/rack-order.ts`.

---

### `lib/db/ownership.test.ts` (extend; source-contract test)

Exact edit points (all verified):
- constants: add `const RACK_ORDER_ACTIONS_PATH = join(REPO_ROOT, "app/actions/rack-order.ts");` beside line 19.
- line 70: add `const rackOrderActionsSource = stripComments(readFileSync(RACK_ORDER_ACTIONS_PATH, "utf8"));`
- add the source to the three lists: auth-first (lines 73-79), no-owner-param (95-102), owned-table loop (142-149: `["app/actions/rack-order.ts", rackOrderActionsSource]`).
- add an "exports exactly" case copying lines 135-139 with `expect(fns).toEqual(["saveRackOrder"])`.
- Keep `app/design/actions.ts` exporting exactly `["deleteModel","duplicateModel","renameModel","saveModel"]` (line 113): the D-01/D-02/D-16 hooks must be non-exported helpers.
- The loop at lines 152-175 splits on every `db.<verb>(`: each insert statement needs `clerkUserId:` and each select/update/delete needs `eq(X.clerkUserId,`. A hook helper in `app/design/actions.ts` that selects or upserts `userPreferences` must satisfy this too (select `.where(eq(userPreferences.clerkUserId, userId))`).

---

### `app/design/actions.ts` — D-01 / D-02 / D-16 hooks (controller, CRUD)

**Analog:** itself. Insert points:
- `saveModel` new-row branch (lines 67-73):
```typescript
if (modelId === null) {
  const [row] = await db.insert(models)
    .values({ clerkUserId: userId, name: trimmed, snapshot: envelope })
    .returning({ id: models.id });
  revalidatePath("/");
  return { id: row.id };
}
```
  Hook between insert and `revalidatePath`, in try/catch, only when a stored list exists.
- `duplicateModel` (lines 143-166), after `.returning({ id: models.id })` at lines 161-163. Per D-16, always store a list (insert the copy after its original in the current automatic order). This needs the shaper's saved rows (`listModels`-style select scoped by `eq(models.clerkUserId, userId)`) to compute the automatic order; it must not take a caller-supplied owner. Wrap in try/catch so a failed placement never fails the duplicate.

---

### `app/page.tsx` / `components/setup/setup-screen.tsx` (route/component)

`app/page.tsx` `BoardRackData` (lines 46-74): read the order in its own try/catch beside the `listModels` try/catch (the pattern at lines 49-58 is the template: log with `console.error("Shaper: failed to ...", error)` and fall back, here to `null`). Pass `rackOrder` to `<SetupScreen models={models} rackOrder={rackOrder} />` (line 74) and add `rackOrder={null}` to both `SetupScreen` calls at lines 33-37 (signed-out and Suspense fallback).

`setup-screen.tsx` `rackEntries` memo (lines 46-69): swap `sortRackEntries(entries)` (line 63) for `applyStoredOrder(entries, effectiveOrder)`; keep the in-progress rule at line 60 (`hasBoardInProgress && modelId === null`). `handleSelectModel` (lines 79-95) stays unchanged (replace-board confirm gate). Imports at lines 3-11 already include `sortRackEntries`; change to `applyStoredOrder` plus the existing types.

---

### `components/setup/board-rack.tsx` (rewrite; keep dialog state)

**Analog:** itself. Keep verbatim: lifted dialog state and handlers (lines 42-86): `renamingModel`, `deletingModel`, `duplicateErrors`, `handleRenameConfirm` (syncs `setBoardName` when the renamed board is open), `handleDeleteConfirm` (`setModelId(null)` if open), `handleDuplicate` (try/catch with "Couldn't duplicate — try again."); dialog JSX (lines 112-130). `entries.length === 0` returns null (line 56 area; the first hook call must precede the early return, as in the existing file). Change heading text from "Your Boards" to "Board Rack" (line 103; heading classes at line 101 are reusable). Replace the grid (lines 105-111) with the rack kind switch.

Rack kind switch: read only from `useCoarsePointer()` (`components/design/use-viewer-media.ts:56-58`), never width (D-04, enforced by the source-contract test below). Render heading, count and the hint in the server markup; mount the rack body only after hydration with a reserved height (RESEARCH Pitfall 4).

---

### `components/setup/rack-card-menu.tsx` (modify)

**Analog:** itself. Add optional props `showMove`, `canMoveLeft`, `canMoveRight`, `onMoveLeft`, `onMoveRight` and two `Menu.Item`s using the file's `ROW_CLASS` (lines 21-22) in the existing popup (lines 62-76):
```typescript
<Menu.Item onClick={onRename} className={cn(ROW_CLASS, "text-surf-ink")}>Rename</Menu.Item>
```
Keep the trigger as a SIBLING of the board button, never a descendant (header comment of `board-rack-card.tsx`, lines 24-28). Trigger label `Board actions for ${boardName}` (line 47) stays. Item visibility is decided by a pure `movesOffered(kind, holdEnabled)` in `rack-config.ts`.

---

### `components/design/use-viewer-media.ts` — `useReducedMotion` (hook)

**Analog:** same file, lines 39-58. Add beside `useCoarsePointer`:
```typescript
const REDUCED_MOTION_QUERY = "(prefers-reduced-motion: reduce)";
export function useReducedMotion(): boolean {
  return useMediaQueryMatch(REDUCED_MOTION_QUERY, false);
}
```
Header comment (lines 12-18) says nobody should reach for these hooks to move a LAYOUT. The rack choice moves a behaviour, not a layout; update the comment with one sentence rather than weakening it. No existing reduced-motion handling anywhere (research grep).

---

### Hover rack / swipe rack / frame loop (component, event-driven)

**No exact analog in the codebase** for an imperative rAF loop writing `setAttribute` through refs, or for an `overflow-x` snap scroller with a rAF-throttled scroll listener. Use RESEARCH Patterns 7, Q-F and the sketches (`.planning/sketches/010-sideways-board-rack/`, `011-phone-rack-reorder/`) as the source. Partial in-repo analogs:
- Text styling for captions: `components/setup/board-rack-card.tsx` (name 20px semibold, 12px muted line, tracked uppercase CTA) and `CardMetadataLine` (`components/setup/card-metadata-line.tsx`).
- `ResizeObserver` for the phone rack height: `components/rails/rail-band-editor.tsx` and `components/viewer/callout-primitives.tsx` (named by research; not re-read).
- Short-screen rule is written inline as `[@media(max-height:500px)]`, height alone (CLAUDE.md Layout section).
- Old Safari button rule: base-layer fix in `app/globals.css` (~line 811) and `e2e/old-safari-buttons.spec.ts`; rack buttons that are flex columns must not rely on default alignment.
- Theme tokens only: `--surf-board-fill`, `--surf-line`, `--surf-ink`, `--surf-ink-muted`, `--surf-accent-ink` (existing in `app/globals.css`).

**aria-live pattern** (`components/design/save-button.tsx` lines 130-132, 152):
```tsx
<span className="min-w-20 text-sm text-surf-ink-muted" aria-live="polite">Saving…</span>
```
Use a visually hidden `aria-live="polite"` region (plus the UI-SPEC status pill) for "Moved {name}. The rack keeps your order."

---

### `app/test-rack/page.tsx` + gate (test-only route)

**Analog:** `app/test-error/page.tsx` (whole file) and `lib/error-pages/forced-error.ts`. The literal `process.env.NODE_ENV` rule is load-bearing:
```typescript
const enabled = forcedErrorRouteEnabled({
  nodeEnv: process.env.NODE_ENV,
  flag: process.env.SHAPER_FORCED_ERROR,
});
if (!enabled) { notFound(); }
```
```typescript
export function forcedErrorRouteEnabled(input: { nodeEnv: string | undefined; flag: string | undefined }): boolean {
  return input.nodeEnv !== "production" && input.flag === "1";
}
```
Copy as `rackStandInRouteEnabled` with flag `SHAPER_RACK_STAND_IN`, plus a `forced-error.test.ts`-style test. Page renders `<SetupScreen models={standInModels(n)} rackOrder={null} />`. Add the env var to `playwright.config.ts` `webServer.env` after the `SHAPER_FORCED_ERROR` entry (the config lists `SHAPER_CONTACT_STAND_IN` then the forced-error flag, with a comment naming test-only and never in Vercel; `playwright.prod.config.ts` strips the whole block).

Stand-in boards: build rows like `rack-models.test.ts` `row()` (line 33-35) from `BOARD_PRESETS` + `presetDesignFields` + `buildSnapshot`, varied lengths, through `rackModelsFromRows`.

**Prod proof:** `e2e/prod/error-pages.spec.ts` lines 25-39: `page.goto(ROUTE)`, `expect(response?.status()).toBe(404)`, not-found heading visible. Copy that test for `/test-rack` (same `dismissPhoneBanners` `beforeEach`, lines 19-22 and 25-27; `test.setTimeout(90_000)`).

---

### `e2e/board-rack.spec.ts`, `e2e/board-rack-phone.spec.ts` (test)

**Analog:** `e2e/slider-touch.spec.ts`. CDP touch (lines 77-105):
```typescript
const client = await page.context().newCDPSession(page);
await client.send("Input.dispatchTouchEvent", { type: "touchStart", touchPoints: [{ x: start.x, y: start.y }] });
for (let i = 1; i <= steps; i++) { ... await client.send("Input.dispatchTouchEvent", { type: "touchMove", touchPoints: [{ x, y }] }); }
await client.send("Input.dispatchTouchEvent", { type: "touchEnd", touchPoints: [] });
```
Project gating (lines 107-113): `test.skip(testInfo.project.name !== "android", "real touch input is only available on the android (Chromium) project")`. Hold-and-drag adds `page.waitForTimeout(~500)` between `touchStart` and the first `touchMove`. Desktop uses `page.mouse.move/down/up` with `steps` and `page.keyboard.press("Alt+ArrowRight")`. Existing specs to update: `e2e/phone-home.spec.ts` (lines ~116, ~233 "Your Boards"; ~222-250 box comparison), `e2e/phone-trip.spec.ts:108-110`, `e2e/old-safari-buttons.spec.ts:122-129`.

---

### `scripts/check-saved-boards.ts` — `--rack-report`

**Analog:** itself. Flag parsing (lines 138-139): `const curvesReportFlag = process.argv.includes("--curves-report");`. Dynamic relative imports after env load (lines 100-132: `await import("../lib/...")`). One read-only select (line 146): `const rows = await db.select({ id: models.id, snapshot: models.snapshot }).from(models);`. **CORRECTION: the research says to select `clerk_user_id` for per-account counts; the existing select is only `id` and `snapshot`, so add `clerkUserId: models.clerkUserId` for counting only and never print it.** Open/not-open loop (lines 157-181): `parseSnapshot` then `summarizeDesign` in try, push id to `notOpened` on catch. Header doc comment (lines 1-80) lists each flag, its output lines, and "Never a snapshot, a board name, a user id or the connection string"; add a `--rack-report` paragraph and the production recipe line in the style of lines 71-73. Share the `{ models, dropped }` variant of `rackModelsFromRows` rather than duplicating logic. Exit code 1 only when a board dropped by the rack that opens today (RESEARCH Q-H).

### `scripts/check-preference-columns.ts`

**Analog:** itself, `NEW_COLUMNS` (lines 63-68): add `{ name: "rack_order", type: "text" }`; update the `column_name in (...)` clause in the `information_schema` query and any "4 of 4" wording (the output line at lines 129-132 builds from `NEW_COLUMNS.length`, so counts follow automatically).

---

### Source-contract tests (`components/setup/rack-source.test.ts`, `rack-config.test.ts`)

**Analog:** `lib/theme.test.ts` lines 54-80 (read a source file with `readFileSync(new URL("../app/globals.css", import.meta.url), "utf8")`, assert against it) and `lib/db/ownership.test.ts` lines 13-30 (`REPO_ROOT` via `fileURLToPath(new URL("../..", import.meta.url))`, `stripComments`). Assertions to write: rack kind read only from `useCoarsePointer` (no `max-shell`/width in the kind switch); theme tokens used exist in `app/globals.css`; no `25.4`/`304.8` literals in new files (also covered by `lib/units-isolation.test.ts`). Vitest config includes `components/**/*.test.ts`.

---

## Shared Patterns

### Account-level preference column (read, write, parse)
**Source:** `lib/blank-makers-preference.ts` + `app/actions/blank-makers.ts` + `lib/db/queries.ts:136-141` + `lib/db/schema.ts:97`
**Apply to:** `lib/models/rack-order.ts`, `app/actions/rack-order.ts`, `readRackOrder`, schema. Null means "not chosen" (here: not arranged). Never throws on read. Strict all-or-nothing parse on write. Last write wins. No `revalidatePath`.

### Ownership and auth (mechanically tested)
**Source:** `lib/db/ownership.test.ts:72-106, 141-176`
**Apply to:** `app/actions/rack-order.ts`, any hook added to `app/design/actions.ts`, `readRackOrder`. `await auth()` before any `db.` call; no `userId|ownerId|clerkUserId` in exported parameter lists; every non-insert statement has `eq(<table>.clerkUserId,`; every insert sets `clerkUserId:`.

### Fail-soft reads on the home page
**Source:** `app/page.tsx:49-58`
**Apply to:** the new `readRackOrder` call (try/catch, `console.error("Shaper: ...", error)`, fall back to `null`). Covers the not-yet-migrated window (project Database rule: additive migration to production BEFORE the push).

### Pure-module register
**Source:** `lib/models/rack-order.ts:1-17`, `lib/geometry/screen-tiles.ts:1-14`
**Apply to:** `rack-art.ts`, `rack-layout.ts`, `rack-gesture.ts`, `rack-order.ts`. No React, browser or database imports; never mutate input; deterministic ties.

### Units (Rule 2)
**Source:** `lib/geometry/units.ts` (`inchesToMm`, `centimetresToMm`), `lib/geometry/summary-line.ts` (`formatSummaryLine`, `formatLengthByWidth`)
**Apply to:** height marks and the captions/vertical words. The sketch's `84 * 25.4` and `304.8` become `inchesToMm(84)` and `inchesToMm(12)`. The card line goes through `formatSummaryLine(summary, system)`.

### Test-only route gating
**Source:** `lib/error-pages/forced-error.ts` + `app/test-error/page.tsx` + `e2e/prod/error-pages.spec.ts:25-39`
**Apply to:** `/test-rack`.

### Three-switch layout rule
**Source:** CLAUDE.md Layout section
**Apply to:** the whole rack. Width = layout, pointer = sizing AND (new, D-04) which rack, height = short screen (inline `[@media(max-height:500px)]`). The CLAUDE.md edit adds one sentence for the pointer's new job.

## No Analog Found

| File | Role | Data Flow | Reason |
|---|---|---|---|
| frame loop hook (`useRackFrame`) in hover/swipe rack | hook | streaming (rAF) | No component in the app mutates SVG attributes through refs per frame; use RESEARCH Pattern 7 and the sketch engine |
| swipe scroller with scroll-snap and turn-on-pass | component | event-driven | No snap scroller exists; use RESEARCH Q-F CSS and sketch 009 |
| hold-and-drag DOM wiring (non-passive `touchmove` registered once at mount) | component | event-driven | No hold/long-press gesture in the app; `lib/models/rack-gesture.ts` pure reducers are new too. Source: sketch 011 template, RESEARCH Pitfall 1 |

## Notes for the planner (corrections and conflicts)

1. **D-16 supersedes RESEARCH Pattern 4, A5 and Open Question 1.** A duplicate in a never-arranged rack stores a list, with the copy right after its original in the then-current automatic order. The `duplicateModel` hook can no longer be "only when the list is non-null".
2. **`silhouette` and `sidePoints` are un-exported** in `screen-tiles.ts` (lines 84 and 116). Add `export`; the research's line numbers for `silhouette` (81-91) are slightly off (the doc comment starts at 81).
3. **Do not name a new exported parameter `userId`/`clerkUserId`** in `lib/db/queries.ts` or any action; `ownership.test.ts:104` fails on it. `readRackOrder(clerkId: string)` is the safe form.
4. **`--rack-report` needs an extra select column** (`clerkUserId`, for counts only) beyond the script's current `id, snapshot` select.
5. **`rack-models.ts` imports use the `@/lib/...` alias; `scripts/` must use relative dynamic imports** (script lines 100-132). The shared `{ models, dropped }` function is imported by the script from `../lib/models/rack-models` (it imports `@/lib/geometry/design` internally; confirm tsx resolves the alias, as the script already imports `../lib/models/design-snapshot` which uses the same convention).
6. **`scripts/` and the e2e specs run outside vitest**: keep `lib/models/rack-stand-in.ts` free of anything that requires the DB client.

## Metadata

**Analog search scope:** `lib/geometry/`, `lib/models/`, `lib/db/`, `lib/error-pages/`, `app/actions/`, `app/design/actions.ts`, `app/page.tsx`, `app/test-error/`, `components/setup/`, `components/design/`, `scripts/`, `e2e/`, `e2e/prod/`, `drizzle/`, `playwright.config.ts`
**Files read this session:** 21
**Pattern extraction date:** 2026-10-05
