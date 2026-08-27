# Phase 2: Accounts & Saved Designs - Pattern Map

**Mapped:** 2026-08-27
**Files analyzed:** 21 (new/modified)
**Analogs found:** 17 / 21

## File Classification

| New/Modified File | Role | Data Flow | Closest Analog | Match Quality |
|---|---|---|---|---|
| `proxy.ts` | middleware | request-response | none in repo (new convention) | no-analog |
| `lib/db/client.ts` | config | CRUD (connection) | `lib/geometry/units.ts` (boundary/config style, no direct analog) | partial (style only) |
| `lib/db/schema.ts` | model | CRUD | `lib/geometry/board.ts` (types file, no DB analog) | partial (style only) |
| `lib/models/design-snapshot.ts` | utility | transform | `lib/geometry/units.ts` (pure boundary conversion module) | role-match |
| `lib/models/design-snapshot.test.ts` | test | transform | `lib/geometry/presets.test.ts` | exact (test style) |
| `app/design/actions.ts` (`saveModel`, `renameModel`, `duplicateModel`, `deleteModel`) | service (Server Actions) | CRUD | `components/design/design-store.tsx` (mutator-function shape: `updateX(patch)` setters) | role-match |
| `lib/db/queries.ts` (`listModels`, `loadModel`) | service | CRUD (read) | `lib/geometry/presets.ts` (`BOARD_PRESETS` static list) — weak; no real read-query analog | partial |
| `app/page.tsx` | route (Server Component) | request-response | `app/page.tsx` (current version, minimal wrapper) | exact |
| `app/layout.tsx` (ClerkProvider wrap) | provider | request-response | `app/layout.tsx` (current `DesignProvider`/`ThemeProvider` nesting) | exact |
| `components/design/design-store.tsx` (gains `loadModel`/model id/dirty tracking) | provider/store | CRUD + event-driven (autosave) | itself — `applyPreset` is the direct analog for a new `applyModel` | exact |
| `components/setup/setup-screen.tsx` (rack section added) | component | CRUD (list render) | itself (current file) | exact |
| `components/setup/board-rack.tsx` | component | CRUD (list render) | `components/setup/setup-screen.tsx`'s preset grid block | role-match |
| `components/setup/board-rack-card.tsx` | component | CRUD (list item) | `components/setup/preset-card.tsx` and `components/setup/continue-board-card.tsx` | exact |
| `components/setup/rack-card-menu.tsx` | component | event-driven | `components/settings-menu.tsx` (Base UI `Menu` built directly, not shadcn) | exact |
| `components/setup/rename-dialog.tsx` | component | request-response (form) | `components/setup/replace-board-dialog.tsx` (shadcn dialog wrapper pattern) + new `dialog`/`input` primitives | role-match |
| `components/setup/delete-confirm-dialog.tsx` | component | request-response (form) | `components/setup/replace-board-dialog.tsx` | exact |
| `components/setup/board-name-prompt.tsx` | component | request-response (form) | `components/setup/replace-board-dialog.tsx` (dialog shell) — no existing text-input dialog | role-match |
| `components/setup/replace-board-dialog.tsx` (copy update only) | component | request-response | itself (current file) | exact |
| `components/site-nav.tsx` (Sign in / avatar / Save / "Saved" tick) | component | event-driven | itself (current file) — same right-cluster pattern as `SettingsMenu` insertion | exact |
| `components/auth/sign-in-dialog.tsx` | component | request-response | `components/setup/replace-board-dialog.tsx` (Dialog chrome sizing/surface) — Clerk owns the form internals | role-match |
| `components/ui/dialog.tsx`, `components/ui/input.tsx` (generated via `npx shadcn add`) | component (generated) | request-response | `components/ui/alert-dialog.tsx`, `components/ui/button.tsx` (existing generated shadcn/Base UI wrappers) | exact |

## Pattern Assignments

### `lib/models/design-snapshot.ts` (utility, transform)

**Analog:** `lib/geometry/units.ts`

**Module boundary doc-comment pattern** (units.ts lines 1-11):
```typescript
/**
 * Units boundary.
 *
 * Millimetres are the only unit the geometry math ... ever sees.
 * ... No other module should perform an inch/mm conversion — route it through this file instead.
 */
```
Apply the same "boundary" framing to `design-snapshot.ts`: it is the *only* place a `DesignState` is validated/(de)serialized for the DB. State in the doc-comment that Server Actions and `lib/db/queries.ts` must import validation from here, never hand-roll a shape check.

**Branded-type handling:** `units.ts` defines `Mm`/`Degrees`/`Litres` as `number & { __brand }`. Since `DesignState` (in `design-store.tsx`) is built entirely from these branded numbers plus plain strings/enums, the Zod schema should validate them as plain `z.number()`/`z.string()` — do not attempt to re-brand at the Zod layer; branding is a compile-time-only device (per Rule 1/2 and RESEARCH.md Pattern 3's comment: "Branded Mm/Degrees/Litres values are plain numbers at runtime, so no custom (de)serializer is needed").

**No React/DB import rule:** Rule 1 in CLAUDE.md ("No React, browser API or database imports in those files") applies by extension here — `lib/models/design-snapshot.ts` must import only from `lib/geometry/*` types and `zod`, never from `drizzle-orm` or `@clerk/nextjs`. Keep DB-touching code in `lib/db/queries.ts` instead, per RESEARCH.md's Wave 0 Gaps note.

---

### `lib/models/design-snapshot.test.ts` (test, transform)

**Analog:** `lib/geometry/presets.test.ts`

**Test file structure** (presets.test.ts lines 1-21):
```typescript
import { describe, expect, it } from "vitest";
import { DEFAULT_FIN_PLACEMENT_SPEC } from "./fins";
import { buildOutline } from "./outline";
import { BOARD_PRESETS } from "./presets";
import { computeRailBands, DEFAULT_RAIL_BAND_SPEC } from "./rail-bands";
import { inchesToMm, mmToInches } from "./units";

describe("BOARD_PRESETS", () => {
  it("has exactly 4 entries with the four unique board-type ids", () => { ... });
  it.each(BOARD_PRESETS)("$id: buildOutline() does not throw and returns non-empty points", (preset) => { ... });
});
```
Apply directly: `describe("designSnapshotSchema", ...)` with round-trip tests — build a `DesignState` fixture (reuse `BOARD_PRESETS[0]` plus `DEFAULT_*_SPEC` constants from `design-store.tsx`'s imports), run it through `serialize`/`validate`, assert deep equality (MODL-01/02's round-trip requirement). File lives at `lib/models/design-snapshot.test.ts`, picked up automatically by `vitest.config.ts`'s `lib/**/*.test.ts` include — no config change needed.

---

### `app/design/actions.ts` (service — Server Actions, CRUD)

**Analog (shape/naming convention):** `components/design/design-store.tsx`'s mutator functions, combined with RESEARCH.md's own Pattern 2 (already-verified against this repo's Next.js 16 docs).

**Mutator-naming convention to mirror** (design-store.tsx lines ~140-180):
```typescript
const updateOutline = (patch: Partial<OutlineSpec>) =>
  setState((prev) => ({ ...prev, outline: { ...prev.outline, ...patch }, boardStarted: true }));
```
Every Server Action should follow the same "verb + Noun, single responsibility, patch-shaped input" convention already established for design mutations — `renameModel(id, name)`, `duplicateModel(id)`, `deleteModel(id)`, `saveModel(id | null, snapshot, name?)` — never a single generic `updateModel(model)` that would require passing full ownership fields from the client (this is also RESEARCH.md's explicit Pitfall 3 warning).

**Server Action body — copy RESEARCH.md Pattern 2 verbatim** (already sourced/verified against this repo's installed Next.js docs):
```typescript
'use server'
import { auth } from '@clerk/nextjs/server'
import { db } from '@/lib/db/client'
import { models } from '@/lib/db/schema'
import { and, eq } from 'drizzle-orm'
import { designSnapshotSchema } from '@/lib/models/design-snapshot'

export async function renameModel(modelId: string, name: string) {
  const { userId } = await auth()
  if (!userId) throw new Error('Sign in to rename a board.')
  const trimmed = name.trim()
  if (!trimmed) throw new Error('Board needs a name.')
  await db.update(models).set({ name: trimmed, updatedAt: new Date() })
    .where(and(eq(models.id, modelId), eq(models.clerkUserId, userId)))
}
```
This is the template for `saveModel`/`duplicateModel`/`deleteModel` too — always `await auth()` first, always scope the `WHERE` by `eq(models.clerkUserId, userId)`, never accept a `clerkUserId`/`userId` parameter from the caller.

---

### `components/design/design-store.tsx` — `applyModel` (extends existing provider)

**Analog:** itself — `applyPreset` (lines ~131-138)

```typescript
const applyPreset = (preset: BoardPreset) =>
  setState(() => ({
    ...DEFAULT_DESIGN_STATE,
    outline: preset.outline,
    rails: preset.rails,
    fins: preset.fins,
    boardStarted: true,
  }));
```
`applyModel(snapshot)` should follow the identical wholesale-replace shape (not a patch merge) since D-11 requires the full snapshot to restore exactly: `outline`, `rails`, `fins`, `volume`, `boardName`, `finSystem`, `finsImportTemplate` all come from the snapshot, plus new fields (`modelId`, `lastSavedAt`/dirty flag) needed for D-08 autosave and D-09 "save writes over the opened board." Also add `modelId: string | null` to `DesignContextValue`, following the same "raw stored spec + derived value" split already used for `outline`/`outlineGeometry`.

**Doc-comment convention to preserve:** every field on `DesignState` has a `/** ... */` explaining *why* it exists and what gates on it (see `boardStarted`'s comment). Any new field (`modelId`, `dirty`/`saveStatus`) needs the same treatment, and per RESEARCH.md Pitfall 4, the existing "Phase 2's named-model saving is where any of this becomes durable" comment on `boardName` must be updated/removed now that Phase 2 is landing.

---

### `components/setup/board-rack-card.tsx` (component, CRUD list item)

**Analog:** `components/setup/preset-card.tsx` (thumbnail/card structure) + `components/setup/continue-board-card.tsx` (truncated-name pattern)

**Card shell + thumbnail framing to copy exactly** (preset-card.tsx lines ~58-77):
```tsx
<button
  type="button"
  onClick={() => onSelect(preset)}
  className={cn(
    "flex w-full flex-col gap-2 rounded-xl border border-transparent bg-surf-canvas p-3 text-left outline-none transition-colors hover:border-surf-accent-ink hover:ring-2 hover:ring-surf-accent-ink focus-visible:border-surf-accent-ink focus-visible:ring-2 focus-visible:ring-surf-accent-ink",
    className,
  )}
>
  <div className="rounded-lg border border-surf-line bg-surf-tab-active p-3">
    <div className="relative aspect-[340/620] w-full overflow-hidden rounded-lg border border-surf-line-faint bg-surf-panel">
      <OutlineViewer geometry={geometry} outline={preset.outline} showConstruction={false} hideCallouts />
    </div>
  </div>
  <span className="text-[20px] leading-[1.2] font-semibold text-foreground">{preset.name}</span>
  ...
</button>
```
UI-SPEC confirms: "Rack cards reuse `PresetCard`'s exact visual weight." Build the outline geometry the same way — `buildOutline(spec.outline)` from `lib/geometry/outline`, never a cached/pre-rendered thumbnail image (same prohibition the preset-card doc-comment states).

**Truncated-name pattern** (continue-board-card.tsx line ~30):
```tsx
<span className="block truncate text-sm leading-[1.5] text-surf-ink-muted">{displayName}</span>
```
Use for the board name row (UI-SPEC's long-text row: "Name truncates to one line... matching `ContinueBoardCard`'s existing `displayName` treatment").

**New content this card needs beyond the analogs:** a metadata line (dims + volume via `lib/geometry/units.ts`'s `formatInchesFraction`/`mmToInches`/litres formatting — never hand-convert 25.4 per CLAUDE.md Rule 2), a last-touched date, and the `rack-card-menu` trigger — none of these exist on `PresetCard`, so they are new markup following the same typography roles UI-SPEC declares (Heading 20px/600 for name, Label 12px/600 for metadata).

---

### `components/setup/rack-card-menu.tsx` (component, event-driven)

**Analog:** `components/settings-menu.tsx` — UI-SPEC explicitly mandates this: "Build it the same way `components/settings-menu.tsx` builds the nav's gear menu: directly on `@base-ui/react/menu`... Do NOT add a shadcn `dropdown-menu`."

**Menu shell to copy** (settings-menu.tsx lines ~30-45):
```tsx
<Menu.Root>
  <Menu.Trigger aria-label="..." className="... hover:text-surf-ink focus-visible:ring-2 focus-visible:ring-surf-accent-ink data-popup-open:text-surf-ink">
    <IconHere aria-hidden className="size-4" />
  </Menu.Trigger>
  <Menu.Portal>
    <Menu.Positioner side="bottom" align="end" sideOffset={10} className="isolate z-50">
      <Menu.Popup className="min-w-64 origin-(--transform-origin) rounded-lg border border-surf-line-faint bg-surf-panel p-1.5 shadow-lg outline-none duration-100 data-open:animate-in ...">
        {/* Menu.Item rows here */}
      </Menu.Popup>
    </Menu.Positioner>
  </Menu.Portal>
</Menu.Root>
```

**Row hover treatment** (settings-menu.tsx `ThemeRow`, line ~99):
```tsx
className="flex cursor-pointer items-center gap-2.5 rounded-md px-2 py-1.5 outline-none select-none data-highlighted:bg-surf-well"
```
Use `Menu.Item` (not `Menu.RadioItem`, since Rename/Duplicate/Delete aren't a toggle group) with this exact row class for Rename/Duplicate; Delete gets the destructive color per UI-SPEC ("the only item that should draw the eye differently").

---

### `components/setup/rename-dialog.tsx`, `board-name-prompt.tsx`, `delete-confirm-dialog.tsx` (components, request-response forms)

**Analog:** `components/setup/replace-board-dialog.tsx`

**Full file to mirror the shell of** (replace-board-dialog.tsx, entire file — 34 lines):
```tsx
"use client";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";

interface ReplaceBoardDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirm: () => void;
}

export function ReplaceBoardDialog({ open, onOpenChange, onConfirm }: ReplaceBoardDialogProps) {
  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Start a new design?</AlertDialogTitle>
          <AlertDialogDescription>...</AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Keep Editing</AlertDialogCancel>
          <AlertDialogAction variant="destructive" onClick={onConfirm}>Discard & Start New</AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
```
`delete-confirm-dialog.tsx` is the closest 1:1 (also destructive, also `open`/`onOpenChange`/`onConfirm` props, also fixed copy with one interpolated value — the board name). Use the *new* `dialog` primitive (not `alert-dialog`) for `rename-dialog.tsx`/`board-name-prompt.tsx` since those need a text `input` and a non-destructive primary action — UI-SPEC: "Style it identically to the existing `alert-dialog` usage in `replace-board-dialog.tsx` (surf-panel surface, surf-line-faint border, surf-ink text) — no new chrome," so once `npx shadcn add dialog input` generates `components/ui/dialog.tsx`/`input.tsx`, match the same header/footer/button layout this file already uses, just swapping `AlertDialog*` for `Dialog*` and adding an `<Input>` + inline validation error row.

**Copy source for these three files:** UI-SPEC's Copywriting Contract table (Section "Additional copy this phase needs") — copy every title/label/placeholder/button string verbatim from there, no re-authoring.

**Replace-board-dialog.tsx copy update (Pitfall 4):** the current `AlertDialogDescription` text ("...saving arrives in Phase 2.") must be replaced per UI-SPEC's row: "This replaces your board in progress. It hasn't been saved — {opening this board / starting new} will lose it." with buttons "Keep Editing" / "Discard & Open" (loading a saved board, D-10) or "Discard & Start New" (existing preset path, unchanged).

---

### `components/site-nav.tsx` (Sign in / avatar / Save / "Saved" tick)

**Analog:** itself — the existing right-hand cluster insertion pattern

**Insertion point and separator convention** (site-nav.tsx lines ~44-48):
```tsx
<span aria-hidden className="ml-1 h-4 w-px bg-surf-line-faint" />
<SettingsMenu />
```
New Save control + auth control slot in after `SettingsMenu` (or before, per D-02's "right end of nav" — exact ordering is a UI-SPEC/execution-time call), using the same hairline-separator technique to mark it as "chrome, not a sixth screen." The nav's `active` conditional class-string style (lines ~35-41) is the convention to mirror for the Save button's three visual states (default / `Saving…` / `Saved` tick / `Not saved` warning) — build as a small state-driven className switch, not a separate component per state.

**Loading-placeholder convention (UI-SPEC nav-auth-control "loading" row):** reserve a fixed-size slot so Clerk's async auth resolution never causes a "Sign in" flash before flipping to the avatar — same idea as this file reserving fixed width per nav link.

---

### `components/auth/sign-in-dialog.tsx`

**Analog:** `components/setup/replace-board-dialog.tsx` (Dialog chrome/sizing only — the form body is entirely Clerk's `<SignIn>`/`<SignUp>`)

UI-SPEC: "Dialog content uses the same `max-w-sm` sizing as `replace-board-dialog.tsx`." Wrap Clerk's components with the new shadcn `Dialog` (not `alert-dialog`, since this isn't a destructive confirm), matching the same header/content/overlay structure `alert-dialog.tsx`'s primitives already establish (see `components/ui/alert-dialog.tsx` lines 1-16 for the Base UI wrapper convention `Dialog` should mirror once generated: `data-slot` attributes, `cn()`-merged className, forwarding all primitive props).

---

## Shared Patterns

### Units at the UI edge (Rule 2)
**Source:** `lib/geometry/units.ts`
**Apply to:** `board-rack-card.tsx` (dims + volume display), any place a saved snapshot's numbers reach the screen.
```typescript
export function mmToInches(value: Mm): number { return value / MM_PER_INCH; }
export function formatInchesFraction(value: Mm, denominator: 8 | 16 | 32 = 16): string { ... }
export function cubicMmToLitres(volumeMm3: number): Litres { return litres(volumeMm3 / 1_000_000); }
```
Never inline a `* 25.4` or `/ 1000000` anywhere new — route every conversion through this file.

### Card shell (rounded button, sand-frame, accent hover ring)
**Source:** `components/setup/preset-card.tsx`, `components/setup/continue-board-card.tsx`
**Apply to:** `board-rack-card.tsx`
```tsx
className={cn(
  "flex w-full flex-col gap-2 rounded-xl border border-transparent bg-surf-canvas p-3 text-left outline-none transition-colors hover:border-surf-accent-ink hover:ring-2 hover:ring-surf-accent-ink focus-visible:border-surf-accent-ink focus-visible:ring-2 focus-visible:ring-surf-accent-ink",
  className,
)}
```

### Confirm-dialog shell (fixed copy, destructive action)
**Source:** `components/setup/replace-board-dialog.tsx`
**Apply to:** `delete-confirm-dialog.tsx`, and structurally to `rename-dialog.tsx`/`board-name-prompt.tsx`/`sign-in-dialog.tsx` once swapped to the new `dialog` primitive.

### Base UI menu (not shadcn dropdown-menu)
**Source:** `components/settings-menu.tsx`
**Apply to:** `rack-card-menu.tsx` — mandated explicitly by UI-SPEC.

### Ownership-scoped Server Action
**Source:** RESEARCH.md Pattern 2 (verified against this repo's installed Next.js 16 docs + Clerk's current docs)
**Apply to:** `saveModel`, `renameModel`, `duplicateModel`, `deleteModel` in `app/design/actions.ts` — always `await auth()`, always scope by `eq(models.clerkUserId, userId)`, never accept an owner field as input (Pitfall 3).

### Provider nesting in root layout
**Source:** `app/layout.tsx` (current `DesignProvider`/`ThemeProvider` nesting)
**Apply to:** wrapping with `ClerkProvider` — follow the existing outermost-to-innermost nesting order convention (theme init script → providers → nav → children) rather than restructuring the file.

## No Analog Found

| File | Role | Data Flow | Reason |
|------|------|-----------|--------|
| `proxy.ts` | middleware | request-response | Next.js 16 file convention with no prior instance in this repo (no `middleware.ts` ever existed here); use RESEARCH.md Pattern 1 verbatim instead. |
| `lib/db/client.ts` | config | CRUD (connection) | No DB connection code exists yet anywhere in the repo; use RESEARCH.md Pattern 4 verbatim. |
| `lib/db/schema.ts` | model | CRUD | No Drizzle/SQL schema exists yet; use RESEARCH.md Pattern 3 verbatim. `lib/geometry/board.ts` is a plain TS-types analog for "how this project documents a spec shape," but has no persistence concern to borrow from. |
| `lib/db/queries.ts` (`listModels`, `loadModel`) | service | CRUD (read) | No existing "plain async read function returning rows" exists in this client-only codebase; follow RESEARCH.md's Architectural Responsibility Map guidance (reads as plain async functions, not Server Actions) and Pattern 2's auth/ownership shape for the `WHERE` clause. |

## Metadata

**Analog search scope:** `components/setup/`, `components/design/`, `components/`, `lib/geometry/`, `app/`
**Files scanned:** ~20 (setup screen family, design-store, site-nav, settings-menu, units.ts, presets.test.ts, order-form.tsx, components/ui/*)
**Pattern extraction date:** 2026-08-27
