# Phase 5: The Units Chooser - Pattern Map

**Mapped:** 2026-09-04
**Files analyzed:** 15
**Analogs found:** 15 / 15

## File Classification

| New/Modified File | Role | Data Flow | Closest Analog | Match Quality |
|-------------------|------|-----------|----------------|---------------|
| `lib/units-preference.ts` (new — pref registry/boundary) | config/utility | request-response (pure, DOM-free) | `lib/theme.ts` | exact |
| `lib/units-preference.test.ts` (new) | test | — | `lib/theme.test.ts` | exact |
| `components/units-provider.tsx` (new) | provider | event-driven (useSyncExternalStore) | `components/theme-provider.tsx` | exact |
| `components/settings-menu.tsx` (modified — add Units `Menu.RadioGroup`) | component | request-response | itself (Theme group in same file) | exact |
| `lib/geometry/units.ts` (modified — add metric formatters/parser) | utility | transform | itself (`formatInchesFraction`/`parseImperial` in same file) | exact |
| `lib/geometry/units.test.ts` (modified — add metric suite) | test | — | itself (existing imperial `describe` blocks) | exact |
| `lib/db/schema.ts` (modified — add `userPreferences`/similar table) | model | CRUD | itself (`models` table) | exact |
| `drizzle/000N_*.sql` (new migration) | migration | — | `drizzle/0001_timezone_aware_timestamps.sql` | exact |
| `app/design/actions.ts` or new `app/actions/preferences.ts` (new Server Action(s) for units read/write) | controller/service | request-response, CRUD | `app/design/actions.ts` (`saveModel`, `renameModel`) | exact |
| `lib/db/ownership.test.ts` (extended, or new sibling test) | test | — | itself | exact |
| `lib/db/queries.ts` (modified — add a preference read helper) | service | CRUD | itself (`listModels`) | role-match |
| `app/layout.tsx` (modified — mount `UnitsProvider`, add pre-hydration script) | provider/config | request-response | itself (`ThemeProvider` + `THEME_INIT_SCRIPT` wiring) | exact |
| `app/page.tsx` (modified — read cookie/account units value for first paint) | controller (Server Component) | request-response | itself (`auth()` + `listModels` pattern) | exact |
| `components/setup/board-rack-card.tsx` (modified — `CardMetadataLine` becomes system-aware) | component | transform | itself | exact |
| `components/setup/preset-card.tsx` (modified — new dims line) | component | transform | `board-rack-card.tsx`'s `CardMetadataLine` | exact |
| `lib/geometry/design.ts` (unchanged, reused) | service | transform | — (no new file; `summarizeDesign()` reused as-is) | n/a |
| `lib/models/autosave.ts` (pattern reused, not modified) | utility | event-driven | reused as background-write model for D-11 | exact |
| `CLAUDE.md` (modified — Rule 2 rewrite) | config/docs | — | n/a (no code analog) | n/a |

## Pattern Assignments

### `lib/units-preference.ts` (config/utility, DOM-free preference boundary)

**Analog:** `lib/theme.ts` (whole file — this is the exact structure to mirror)

**Shape to copy** (concepts, not literal lines, since theme has extra multi-value/legacy-alias
machinery units doesn't need — units is a simpler two-value enum):
```typescript
// lib/theme.ts lines 17-49 — the registry + preference type + storage key shape
export type ThemeMode = "light" | "dark";
export const THEME_STORAGE_KEY = "shaper-theme";
export type ThemePreference = "system" | (string & {});
```
For units: `export type UnitsSystem = "imperial" | "metric";` with a storage key constant
beside `THEME_STORAGE_KEY`'s naming convention (e.g. `UNITS_STORAGE_KEY = "shaper-units"`),
plus a cookie name constant for D-12 (no theme precedent for a cookie — this is the one place
units diverges from theme, because theme's flash-free restore is CSS-only and doesn't need
server visibility, while units values are rendered text).

**Parse-with-fallback pattern** (`lib/theme.ts` lines 68-76):
```typescript
export function parseThemePreference(value: unknown): ThemePreference {
  if (typeof value === "string" && LEGACY_ALIASES[value]) return LEGACY_ALIASES[value];
  return isThemePreference(value) ? value : "system";
}
```
Units counterpart: `parseUnitsPreference(value: unknown): UnitsSystem | null` — returns `null`
(not a default) for an absent/unrecognised value, per D-10 ("absence of a value must be
representable everywhere the preference lives"). This is the one place units' contract
diverges from theme's: theme always resolves to a real value (`system` as fallback); units
must distinguish "no preference stored" from "Imperial chosen" — nullable, not defaulted, at
the parse boundary. The *rendering* default (Imperial) is applied by the caller, not by this
function, so the "nothing written until an explicit pick" rule (D-10) stays enforceable.

**Pre-hydration script pattern** (`lib/theme.ts` lines 133-155, `THEME_INIT_SCRIPT`):
Units does NOT need a DOM class-toggling script the way theme does (units renders text, not
CSS classes) — D-12 solves the "no blink" problem via the **cookie read at render time**
(`app/page.tsx`), not a client-side pre-hydration script. Skip this part of the theme pattern;
the analog for "no blink" is instead the Server Component read pattern below.

---

### `components/units-provider.tsx` (provider, event-driven)

**Analog:** `components/theme-provider.tsx` (whole file)

**useSyncExternalStore pattern** (lines 59-71, 104-114):
```typescript
function getStoredPreference(): ThemePreference {
  try {
    return parseThemePreference(localStorage.getItem(THEME_STORAGE_KEY));
  } catch {
    return "system";
  }
}
function getServerPreference(): ThemePreference {
  return "system";
}
// ...
const preference = useSyncExternalStore(
  subscribeToStoredPreference,
  getStoredPreference,
  getServerPreference,
);
```
Units counterpart: `getServerPreference()` must NOT be a fixed default the way theme's is —
D-12 requires the server snapshot to come from the cookie/account value threaded down as a
prop/context from `app/layout.tsx`/`app/page.tsx`, matching what was actually server-rendered.
This is the one place the units provider's shape must diverge from theme's literal code: pass
the resolved server-side value in as an initial prop and close over it in `getServerPreference`,
rather than hardcoding a literal.

**Cross-tab sync via `storage` event** (lines 41-57) — copy verbatim, same mechanism applies.

**Synchronous apply-on-click + background write** (lines 116-127) — the click-time write to
localStorage mirrors directly; the *account* write additionally needs D-11's debounce/backoff
behavior, which has no direct counterpart in `theme-provider.tsx` (theme has no account
storage) — pull that piece from `lib/models/autosave.ts` instead (see Shared Patterns below).

**`useTheme()` hook shape** (lines 147-153) — copy the throw-if-no-provider pattern verbatim
for `useUnits()`.

---

### `components/settings-menu.tsx` (modified — new Units `Menu.RadioGroup`)

**Analog:** the file's own existing Theme group (lines 43-94, 97-128)

**Menu.RadioGroup + GroupLabel + Row pattern** (lines 43-53):
```typescript
<Menu.RadioGroup
  value={preference}
  onValueChange={(next) => setPreference(next as ThemePreference)}
>
  <Menu.GroupLabel className="px-2 pt-1 pb-2 text-[10px] font-bold tracking-architectural text-surf-ink-muted uppercase">
    Theme
  </Menu.GroupLabel>
  <ThemeRow value="system" Icon={MonitorIcon} label="System" detail={`Follows the OS — ${systemTheme.label} right now`} />
  ...
</Menu.RadioGroup>
```

**Row component pattern** (lines 97-128, `ThemeRow`):
```typescript
function ThemeRow({ value, Icon, label, detail }: {...}) {
  return (
    <Menu.RadioItem
      value={value}
      closeOnClick={false}
      className="flex cursor-pointer items-center gap-2.5 rounded-md px-2 py-1.5 outline-none select-none data-highlighted:bg-surf-well"
    >
      <Icon aria-hidden className="size-4 shrink-0 text-surf-ink-muted" />
      <span className="flex-1 leading-tight">
        <span className="block text-sm text-surf-ink">{label}</span>
        <span className="block text-[11px] text-surf-ink-muted">{detail}</span>
      </span>
      <Menu.RadioItemIndicator render={<span className="flex size-4 shrink-0 items-center justify-center" />}>
        <CheckIcon aria-hidden className="size-4 text-surf-accent-ink" />
      </Menu.RadioItemIndicator>
    </Menu.RadioItem>
  );
}
```
`UnitsRow` is this component with the icon prop dropped (fixed `Ruler` icon per D-07, per
UI-SPEC's Component Notes). Place the new `Menu.RadioGroup` for Units ABOVE the existing Theme
one (D-05), inside the same `Menu.Popup`, each top-level group as a sibling — see UI-SPEC's
exact JSX skeleton (05-UI-SPEC.md lines 189-199).

---

### `lib/geometry/units.ts` (modified — add metric formatters + parser)

**Analog:** itself — `formatInchesFraction` (lines 55-85), `formatFeetInches` (lines 129-135),
`parseImperial` (lines 144-192) are the direct structural templates for the new metric
counterparts.

**Formatter pattern to mirror** (lines 55-68, epsilon-nudge rounding discipline):
```typescript
export function formatInchesFraction(value: Mm, denominator: 8 | 16 | 32 = 16): string {
  const inches = mmToInches(value);
  const sign = inches < 0 ? "-" : "";
  const nudge = inches < 0 ? -1e-9 : 1e-9;
  const rounded = Math.abs(Math.round(inches * denominator + nudge) / denominator);
  ...
}
```
New `formatCentimeters(value: Mm): string` (D-01: one decimal, e.g. `"51.4"`, no unit suffix —
composition happens at the call site per UI-SPEC) should apply the same epsilon-nudge tie-break
discipline before `.toFixed(1)`, and a new `formatWholeMm(value: Mm): string` (D-02, marks
family) rounds to the nearest integer mm with the same nudge. Both are pure, no unit suffix
baked in (matches `formatInchesFraction`'s bare-number-plus-quote convention being the
exception, not the rule — cm/mm formatters return bare numbers per UI-SPEC's dims-line
composition contract).

**Parser pattern to mirror** (lines 144-192, `parseImperial`):
```typescript
export function parseImperial(input: string): Mm | null {
  if (input == null) return null;
  const trimmed = input.trim();
  if (trimmed.length === 0) return null;
  ...
  return inchesToMm(total);
}
```
New `parseMetric(input: string, fieldUnit: "cm" | "mm"): Mm | null` follows the same
null-on-unreadable contract (D-04) — bare number reads as `fieldUnit`, explicit `cm`/`mm`
suffix overrides. Same return-null-not-throw discipline as `parseImperial`.

**Round-trip guard** — new tests pin UNIT-05 the way `lib/geometry/units.test.ts`'s existing
suite pins the imperial round trip (see below).

---

### `lib/geometry/units.test.ts` (modified — add metric suite)

**Analog:** itself — existing `describe` blocks for `formatInchesFraction`/`parseImperial`
give the value-table test shape to copy for the new metric functions (values computed from
known mm conversions, no golden fixture — same sanctioned no-golden-ancestor exception Phase 4
D-14 used, per CONTEXT.md's Established Patterns section).

---

### `lib/db/schema.ts` (modified — new per-user preference storage)

**Analog:** itself — the `models` table (lines 15-26) is the only existing table and sets the
project's Drizzle conventions (uuid pk, `clerkUserId` text column with an index, timestamps).

**Table-definition pattern to mirror**:
```typescript
export const models = pgTable(
  "models",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    clerkUserId: text("clerk_user_id").notNull(),
    name: text("name").notNull(),
    snapshot: jsonb("snapshot").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [index("models_clerk_user_id_idx").on(table.clerkUserId)],
);
export type ModelRow = typeof models.$inferSelect;
```
New table (planner names it, e.g. `userPreferences`) should key on `clerkUserId` (unique this
time, one row per user, not indexed-but-repeatable like `models`), with a **nullable** units
column (D-10: absence must be representable — `text("units")` with no `.notNull()`, values
`"imperial" | "metric"` or the column itself absent/null). Same `withTimezone` timestamp
convention if `updatedAt` is tracked.

---

### `drizzle/000N_*.sql` (new migration)

**Analog:** `drizzle/0001_timezone_aware_timestamps.sql` — generated by `npm run db:generate`,
never hand-written. No excerpt needed; the pattern is procedural (CLAUDE.md's push-then-migrate
rule): push code to `main`, let Vercel deploy, only then `npm run db:migrate:prod`.

---

### New Server Action(s) for units read/write (e.g. `app/actions/preferences.ts`)

**Analog:** `app/design/actions.ts` — `saveModel` (lines 32-78) and `renameModel` (lines 87-113)

**Auth-before-DB pattern** (lines 37-38, repeated at every action):
```typescript
export async function saveModel(modelId: string | null, name: string, snapshot: unknown): Promise<SaveModelResult> {
  const { userId } = await auth();
  if (!userId) throw new Error("Sign in to save a board.");
  ...
}
```
New `setUnitsPreference(system: UnitsSystem): Promise<void>` (or similar) must call
`await auth()` first, exactly this shape, and — since D-11 says a signed-out shaper's pick
only ever needs the browser/cookie mirror — this action itself doesn't need to guard against
signed-out callers with a thrown error the way `saveModel` does; it simply resolves to a no-op
write path or is never called client-side while signed out. Follow `renameModel`'s ownership-
scoped upsert shape (lines 87-113) for the write itself — a nullable per-user row is an upsert
(`onConflictDoUpdate`) unlike `models`' explicit insert/update branching, since this is a
single row per user rather than many rows.

**No-owner-parameter rule** — the action's parameter list must never accept a `clerkUserId`
argument from the client, mirroring `saveModel`'s signature contract (verified mechanically by
`lib/db/ownership.test.ts`, see below).

---

### `lib/db/ownership.test.ts` (extended or sibling test)

**Analog:** itself, whole file — this is the exact mechanical contract (auth-before-db-call,
no owner param in any exported signature, every Drizzle statement scoped by `clerkUserId`) that
any new preference-writing action must also satisfy. Either extend this file's `ACTIONS_PATH`/
`QUERIES_PATH` scanning to include the new preferences action file, or add a parallel test file
using the identical `stripComments`/`exportedAsyncFunctions`/regex-scan helpers (lines 17-56).
The three assertions to replicate for the new file:
```typescript
// lines 62-76: await auth() precedes any db.(select|insert|update|delete)( call
// lines 78-86: no exported signature matches /userId|ownerId|clerkUserId/ in its params
// lines 96-124: every db call's statement text is scoped by eq(<table>.clerkUserId, ...)
```

---

### `app/layout.tsx` (modified — mount `UnitsProvider`)

**Analog:** itself — `ThemeProvider` mounting (lines 82-89) and `THEME_INIT_SCRIPT` inline
script wiring (lines 61-80)

**Provider nesting pattern** (lines 81-90):
```typescript
<body className="flex h-full flex-col overflow-hidden bg-surf-ground">
  <ThemeProvider>
    <Provider>
      <div className="flex min-h-0 flex-1 flex-col">
        <SiteNav />
        {children}
      </div>
    </Provider>
  </ThemeProvider>
</body>
```
`UnitsProvider` joins as another wrapper here, likely outside/beside `ThemeProvider` — but
unlike `ThemeProvider`, it needs a server-computed initial value passed in as a prop (the
cookie/account read), since `RootLayout` itself doesn't call `auth()` today. That read may need
to happen in `RootLayout` itself (adding `await auth()` + a cookie read there) or be threaded
through per-page (`app/page.tsx` already reads `auth()`) — this is an implementation decision
the planner resolves, but the wiring POINT is this file, same as theme's script tag (lines
61-80) which shows the precedent for "layout-level pre-render concerns live here."

---

### `app/page.tsx` (modified — read cookie/account units value)

**Analog:** itself — the `auth()`-first Server Component pattern (lines 31-43) already reads
identity before rendering; extend it to also resolve the units preference (account row if
signed in, else cookie) before `<SetupScreen>` renders, matching the file's own degrade-safely
posture (lines 45-69, `BoardRackData`'s try/catch-and-fall-back-to-empty pattern) — a failed
preference read should fall back to Imperial rather than breaking the page, the same way a
failed model list read falls back to `[]`.

---

### `components/setup/board-rack-card.tsx` (modified — system-aware `CardMetadataLine`)

**Analog:** itself, `CardMetadataLine` (lines 95-102)

**Current implementation to extend**:
```typescript
function CardMetadataLine({ summary }: { summary: DesignSummary }) {
  return (
    <span className="text-xs leading-[1.4] font-semibold text-surf-ink-muted">
      {formatFeetInches(summary.length)} · {formatInchesFraction(summary.widePointWidth)} ·{" "}
      {formatInchesFraction(summary.centerThickness)} · {summary.volumeLitres.toFixed(1)} L
    </span>
  );
}
```
Per UI-SPEC's Component Notes, extract this into a shared module both `board-rack-card.tsx` and
`preset-card.tsx` import, branching on the units system:
- Imperial branch: exactly the existing three-`·`-separated string (unchanged, byte for byte).
- Metric branch (new): `{formatCentimeters(length)} × {formatCentimeters(width)} × {formatCentimeters(thickness)} cm · {volume.toFixed(1)} L`
  (D-01/D-02/D-03, UI-SPEC lines 230-231). Same `text-xs leading-[1.4] font-semibold
  text-surf-ink-muted` classes for both.

---

### `components/setup/preset-card.tsx` (modified — new dims line)

**Analog:** `board-rack-card.tsx`'s `CardMetadataLine` (lines 95-102) for the format/compose
logic; own file's existing `<span>` stack (lines 76-80) for where the new line inserts.

**Insertion point** (existing lines 76-80):
```typescript
<span className="text-[20px] leading-[1.2] font-semibold text-foreground">{preset.name}</span>
<span className="text-sm leading-[1.5] text-surf-ink-muted">{preset.descriptor}</span>
<span className="text-xs leading-[1.4] font-semibold tracking-architectural text-surf-accent-ink uppercase">
  Start Shaping
</span>
```
New dims `<span>` goes between name and descriptor (D-14, UI-SPEC lines 211-215), using
`summarizeDesign()` on the preset's own outline/rocker/foil/rails/fins (D-13) — reusing
`lib/geometry/design.ts`'s `summarizeDesign()` exactly as `board-rack-card.tsx` already does
(no second computation) — and the shared `CardMetadataLine`-equivalent formatting logic
extracted above.

---

## Shared Patterns

### Preference boundary (DOM-free module + parse-with-fallback)
**Source:** `lib/theme.ts` (whole file)
**Apply to:** `lib/units-preference.ts`
```typescript
export const THEME_STORAGE_KEY = "shaper-theme";
export function parseThemePreference(value: unknown): ThemePreference {
  if (typeof value === "string" && LEGACY_ALIASES[value]) return LEGACY_ALIASES[value];
  return isThemePreference(value) ? value : "system";
}
```
Divergence to note everywhere this is applied: theme always has a resolvable default
(`system`); units must support a real "nothing chosen yet" state (`null`), per D-10.

### useSyncExternalStore provider with cross-tab sync
**Source:** `components/theme-provider.tsx` lines 39-153
**Apply to:** `components/units-provider.tsx`
```typescript
const storeListeners = new Set<() => void>();
function subscribeToStoredPreference(onStoreChange: () => void) {
  storeListeners.add(onStoreChange);
  window.addEventListener("storage", onStoreChange);
  return () => { storeListeners.delete(onStoreChange); window.removeEventListener("storage", onStoreChange); };
}
```
Divergence: `getServerSnapshot` must read a real cookie/account value passed down, not a fixed
literal (D-12) — see UI-SPEC and CONTEXT.md "Provider and hook shape" discretion note.

### Auth-first Server Action + no-owner-param + ownership-scoped statement
**Source:** `app/design/actions.ts` (whole file), pinned mechanically by `lib/db/ownership.test.ts`
**Apply to:** the new units-preference Server Action(s)
```typescript
export async function saveModel(...) {
  const { userId } = await auth();
  if (!userId) throw new Error("Sign in to save a board.");
  ...
}
```

### Debounce + quiet-retry background write
**Source:** `lib/models/autosave.ts` (whole file, 72 lines)
**Apply to:** the units provider's account-write path (D-11)
```typescript
export function decideAutosave(input: AutosaveDecisionInput): AutosaveDecision {
  if (!input.signedIn) return "idle";
  if (input.modelId === null) return "idle";
  if (!input.dirty) return "idle";
  if (input.inFlight) return "wait";
  return "save";
}
export const AUTOSAVE_DEBOUNCE_MS = 1200;
export function nextStatusAfter(result: PromiseSettledResult<unknown>): SaveStatus {
  return result.status === "fulfilled" ? "saved" : "error";
}
```
Units' background write is simpler (no debounce needed — a units pick is a single discrete
click, not a stream of slider drags) but should copy the "never let a rejected write claim
success" discipline (`nextStatusAfter`'s core prohibition) and a quiet-retry-with-backoff shape
for the failed-write case (D-11: "a failed write never blocks the switch and never reverts the
screen").

### Source-contract tests for behavior outside pure functions
**Source:** `lib/theme.test.ts`, `lib/db/ownership.test.ts`, `lib/auth/open-access.test.ts`
**Apply to:** any new drift-guard needed for the units preference module/provider/actions
```typescript
function stripComments(source: string): string {
  return source.replace(/\/\*[\s\S]*?\*\//g, "").split("\n").map((line) => line.replace(/\/\/.*$/, "")).join("\n");
}
```
This house idiom (read the real source file, regex/brace-match it, assert a structural
property) is how the codebase pins "never gates a route," "always auth-before-db," and "script
agrees with module" — the same idiom should pin D-12's cookie-read-at-render-time if that
proves hard to unit test any other way, and D-10's "nothing written on mount with no stored
value" if not already covered by a plain unit test on the parse function.

### Typed-entry contract (focus → raw string, blur/Enter → parse, clamp, snap, reformat, revert)
**Source:** `components/rocker/imperial-field.tsx` (whole file)
**Apply to:** any Phase 6 metric equivalent (not built this phase, but the parser landing in
`units.ts` this phase — D-04 — is explicitly built as this component's future counterpart)
```typescript
function commit(typed: string) {
  const parsedMm = parseImperial(typed);
  if (parsedMm === null) { setError(...); setRaw(formatInchesFraction(value)); return; }
  ...
  onCommit(snapped);
}
```
Noted for provenance only — `parseMetric`'s contract (return null on unreadable input) is
designed to slot into this exact commit function shape later, per CONTEXT.md's canonical refs.

## No Analog Found

None — every file in this phase's scope has a direct, exact-match analog already shipping in
the codebase, per CONTEXT.md's own framing ("the theme preference... is the exact pattern to
mirror") and the UI-SPEC's framing ("nothing here is a new visual language").

## Metadata

**Analog search scope:** `lib/`, `components/theme-provider.tsx`, `components/settings-menu.tsx`,
`components/setup/`, `lib/db/`, `app/design/actions.ts`, `app/layout.tsx`, `app/page.tsx`,
`lib/models/autosave.ts`, `drizzle/`
**Files scanned:** 17 (all directly named in CONTEXT.md's canonical_refs and code_context, plus
`app/page.tsx`, `lib/geometry/presets.ts` head, `drizzle/` listing)
**Pattern extraction date:** 2026-09-04
