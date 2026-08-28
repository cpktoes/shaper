---
phase: 02-accounts-saved-designs
reviewed: 2026-08-28T01:32:30Z
depth: standard
files_reviewed: 42
files_reviewed_list:
  - .gitignore
  - app/design/actions.ts
  - app/design/layout.tsx
  - app/layout.tsx
  - app/page.tsx
  - components/auth/nav-auth-control.tsx
  - components/auth/sign-in-banner.tsx
  - components/auth/sign-in-dialog.tsx
  - components/design/design-store.tsx
  - components/design/save-button.tsx
  - components/setup/board-name-prompt.tsx
  - components/setup/board-rack-card.tsx
  - components/setup/board-rack.tsx
  - components/setup/delete-confirm-dialog.tsx
  - components/setup/rack-card-menu.tsx
  - components/setup/rename-dialog.tsx
  - components/setup/replace-board-dialog.tsx
  - components/setup/setup-screen.tsx
  - components/site-nav.tsx
  - components/ui/dialog.tsx
  - components/ui/input.tsx
  - drizzle.config.ts
  - drizzle/0000_moaning_zodiak.sql
  - drizzle/meta/0000_snapshot.json
  - drizzle/meta/_journal.json
  - lib/auth/open-access.test.ts
  - lib/db/client.ts
  - lib/db/ownership.test.ts
  - lib/db/queries.ts
  - lib/db/schema.ts
  - lib/geometry/design.test.ts
  - lib/geometry/design.ts
  - lib/models/autosave.test.ts
  - lib/models/autosave.ts
  - lib/models/banner-dismissal.test.ts
  - lib/models/banner-dismissal.ts
  - lib/models/design-snapshot.test.ts
  - lib/models/design-snapshot.ts
  - lib/models/rack-order.test.ts
  - lib/models/rack-order.ts
  - package.json
  - proxy.ts
findings:
  critical: 3
  warning: 3
  info: 2
  total: 8
status: issues_found
---

# Phase 02: Code Review Report

**Reviewed:** 2026-08-28T01:32:30Z
**Depth:** standard
**Files Reviewed:** 42
**Status:** issues_found

## Summary

The IDOR/ownership story is genuinely solid: every Server Action in `app/design/actions.ts`
derives `userId` from `await auth()` before touching the database, every mutating statement is
scoped with `eq(models.clerkUserId, userId)`, and `lib/db/ownership.test.ts` /
`lib/auth/open-access.test.ts` mechanically enforce both of those properties plus D-01 (no
`.protect()` gating the design tool). `lib/models/design-snapshot.ts` validates every snapshot
with Zod on both the write and read path, and the version-tolerant `.partial()` schema is
implemented correctly (round-trip and malformed-input tests both pass the intended cases).

The defect surface is concentrated in the client-side save/autosave state machine in
`components/design/design-store.tsx` and `components/design/save-button.tsx`. Both files carry
extensive doc comments describing an invariant ("a `SaveStatus` of `saved` may only ever follow
a write the server actually confirmed") that the implementation does not actually uphold in two
concrete, reachable scenarios: a lost-update race during autosave, and a rename of the
currently-open board that a later autosave silently reverts. A third bug leaves the very first
save's failure path completely unhandled. These are all real data-integrity/UX regressions, not
speculative — each is traceable step-by-step through the code below.

## Critical Issues

### CR-01: Autosave can report "Saved" while a newer, unsent edit is silently dropped

**File:** `components/design/design-store.tsx:443-471`

**Issue:** `performSave` snapshots `designSnapshotFields` at the moment it starts
(`snapshotAtSaveTime`, line 447) and fires `saveModel` with that stale copy. If the shaper makes
another edit *while that request is in flight* (any `updateOutline`/`updateFins`/etc. call sets
`dirty: true` again, which is a no-op since it was already `true`), the `.then` handler that
runs when the **first** request resolves unconditionally resets the flag:

```ts
setState((prev) => ({ ...prev, dirty: false, saveStatus: nextStatusAfter(settled) }));
```

This clobbers the `dirty: true` that the newer edit set, even though that edit's data was never
part of the request that just completed. `decideAutosave` (`lib/models/autosave.ts`) will now see
`dirty: false` and never schedule another save. The board in Postgres is now missing an edit the
shaper made, the nav shows "Saved", and nothing will retry — the edit is lost until the page is
reloaded and the shaper notices (if they ever do) that the reopened board doesn't match what they
last saw.

This directly violates the file's own stated contract in `lib/models/autosave.ts`'s doc comment:
*"a `SaveStatus` of `'saved'` may only ever follow a write the server actually confirmed."* Here
`saved` is reported for a state the server was never sent.

**Fix:** Only clear `dirty` if nothing has changed since the snapshot that was actually sent —
compare the just-sent snapshot against the current one, or use a monotonically increasing
version/generation counter and only clear `dirty` when the confirmed generation matches the
latest one:

```ts
const generationAtSaveTime = generationRef.current; // bumped by every mutator
// ...
.then((result) => {
  setState((prev) => ({
    ...prev,
    dirty: generationRef.current !== generationAtSaveTime ? true : false,
    saveStatus: nextStatusAfter(settled),
  }));
})
```

### CR-02: Renaming the currently-open board from the rack is silently undone by the next autosave

**File:** `components/setup/board-rack.tsx:60-63`, `components/design/design-store.tsx:296-304`

**Issue:** `BoardRack`'s rename handler calls the Server Action directly and never touches the
shared design store:

```ts
const handleRenameConfirm = async (name: string) => {
  if (!renamingModel) return;
  await renameModel(renamingModel.id, name);
};
```

`DesignProvider` (mounted once in `app/layout.tsx`) is shared between the setup screen and every
design screen. If a shaper has a board open (`modelId` set to some row X) and renames that exact
row X from its rack card menu, `renameModel` updates the database row's `name`/`snapshot.boardName`
correctly — but the in-memory store's `state.boardName` is never told about it. The very next
design edit sets `dirty: true` with the store's stale `boardName`, and the next autosave
(`performSave`, `design-store.tsx:443-471`) calls `saveModel(modelIdAtSaveTime, nameAtSaveTime, …)`
using `nameAtSaveTime = state.boardName` — the **old** name — overwriting the just-renamed row
back to its previous name. The rename appears to succeed (the rack card updates via
`revalidatePath`) and is then silently reverted moments later with no error, no warning, and no
way for the shaper to know it happened.

This is reachable through completely ordinary usage: open a board, go back to `/`, rename that
same board from its menu, go back into the editor and nudge any slider.

**Fix:** Either have `BoardRack`/`SetupScreen` call `setBoardName` (or a new store setter) when the
renamed row is the one currently open, or have `renameModel`'s result route back through the store
the same way `markSaved` does:

```ts
const handleRenameConfirm = async (name: string) => {
  if (!renamingModel) return;
  await renameModel(renamingModel.id, name);
  if (renamingModel.id === modelId) setBoardName(name); // keep the store in sync
};
```

### CR-03: The very first save's failure is completely unhandled when the name prompt is skipped

**File:** `components/design/save-button.tsx:48-58, 71-76`

**Issue:** `runFirstSave` has no `catch`:

```ts
const runFirstSave = async (name: string) => {
  setFirstSaveInFlight(true);
  try {
    const { id } = await saveModel(modelId, name, { ...designSnapshotFields, boardName: name });
    markSaved(id, name);
  } finally {
    setFirstSaveInFlight(false);
  }
};
```

When the shaper has already typed a board name (e.g. on the Summary screen) before ever pressing
Save, `startSave` skips the name-prompt dialog entirely and calls this directly with no error
handling at the call site either:

```ts
const trimmed = boardName.trim();
if (!trimmed) {
  setNamePromptOpen(true);
  return;
}
void runFirstSave(trimmed); // fire-and-forget, no .catch
```

If `saveModel` rejects (network drop, the "Sign in to save a board." guard racing a session
expiry, a Server Action id rotated by a redeploy — the exact case this codebase's own comments
elsewhere call out as a real failure mode), this becomes an unhandled promise rejection. There is
no UI error state for this path at all: the button just falls back to the plain "Save" state via
`finally`, with nothing telling the shaper the save never happened. In development this also
surfaces as Next.js's `unhandledrejection` error overlay — a jarring, technical failure screen for
an audience CLAUDE.md explicitly describes as "shapers and surfers, not developers."

The dialog-driven path (`BoardNamePrompt.handleSubmit`) *does* catch this correctly, because the
dialog wraps its own `await onSave(trimmed)` in `try/catch` — so the bug is specific to the
skip-the-dialog branch.

**Fix:** Give `runFirstSave` its own catch that reports failure the same way the store's
`saveStatus: "error"` path does, and make sure the direct call site surfaces it:

```ts
const runFirstSave = async (name: string) => {
  setFirstSaveInFlight(true);
  try {
    const { id } = await saveModel(modelId, name, { ...designSnapshotFields, boardName: name });
    markSaved(id, name);
  } catch (error) {
    console.error("Shaper: first save failed", error);
    setFirstSaveError("Couldn't save — check your connection and try again.");
  } finally {
    setFirstSaveInFlight(false);
  }
};
```

## Warnings

### WR-01: `saveModel`'s update path reports success even when zero rows were affected

**File:** `app/design/actions.ts:65-69`

**Issue:** The update branch of `saveModel` never checks whether the write actually matched a
row:

```ts
await db.update(models)
  .set({ name: trimmed, snapshot: envelope, updatedAt: new Date() })
  .where(and(eq(models.id, modelId), eq(models.clerkUserId, userId)));
revalidatePath("/");
return { id: modelId };
```

If `modelId` no longer belongs to a row (deleted from another tab/device, or a stale id lingering
in the client after some other desync), the `WHERE` clause correctly prevents touching another
shaper's data, but the statement simply updates nothing — and the function still returns
`{ id: modelId }` as if the save succeeded. `design-store.tsx`'s `performSave` treats any resolved
promise as `nextStatusAfter → "saved"`, so the nav shows "Saved" while the database still holds
whatever it held before. The single-tab delete-then-edit case is guarded elsewhere
(`board-rack.tsx` clears `modelId` when the open board is the one being deleted), but any
multi-tab/multi-device session is not.

**Fix:** Check the mutation's affected-row count (or add `.returning({ id: models.id })` and
verify a row came back) and throw if it's empty, the same way `renameModel`/`duplicateModel`
already do via their pre-update `select`:

```ts
const [row] = await db.update(models)
  .set({ name: trimmed, snapshot: envelope, updatedAt: new Date() })
  .where(and(eq(models.id, modelId), eq(models.clerkUserId, userId)))
  .returning({ id: models.id });
if (!row) throw new Error("Couldn't find that board.");
```

### WR-02: Failed autosaves retry every 1200ms indefinitely, with no backoff

**File:** `components/design/design-store.tsx:479-495`, `lib/models/autosave.ts:46-52`

**Issue:** On a rejected save, `dirty` correctly stays `true` (good — no false "saved" state
here), but the autosave effect re-evaluates on every `saveInFlight` transition, and
`decideAutosave` has no notion of "this just failed, back off." The result is that a save failure
caused by something persistent (backend outage, an expired/invalid session that keeps rejecting)
triggers an immediate re-attempt on the very next debounce tick, forever, with no exponential
backoff or attempt cap — effectively a retry storm against a degraded dependency for as long as
the tab stays open.

**Fix:** Track consecutive-failure count and grow the retry delay (or cap retries and require a
manual "Not saved" click, which the UI already supports) rather than retrying unconditionally
every `AUTOSAVE_DEBOUNCE_MS`.

### WR-03: `created_at`/`updated_at` are timezone-naive, but formatted as if they were exact

**File:** `lib/db/schema.ts:22-23`, `components/setup/board-rack-card.tsx:79-81`

**Issue:** Both timestamp columns use Drizzle's default `timestamp()` (no `withTimezone: true`),
so Postgres stores/returns a timezone-naive value. `formatLastTouched` then renders it via
`date.toLocaleDateString(...)` in the browser's local timezone. Depending on how the driver
parses the naive timestamp (typically as UTC) versus the shaper's own offset, "Last touched" can
show the wrong calendar day near midnight in either direction — a small but user-visible
correctness issue for a value the rack explicitly surfaces to build trust in "most recently
touched first" ordering.

**Fix:** Declare the columns `timestamp("created_at", { withTimezone: true }).defaultNow()` (and
the matching migration) so the stored instant is unambiguous regardless of client timezone.

## Info

### IN-01: `useTransition` here doesn't actually cover the async work it wraps

**File:** `components/design/design-store.tsx:226, 450-471`

**Issue:** `startSaveTransition` is given a plain synchronous callback that kicks off
`saveModel(...).then(...).catch(...).finally(...)` and returns immediately (`undefined`). None of
the state updates inside `.then`/`.catch`/`.finally` are actually part of the transition — React
only tracks a transition's async duration when the callback itself is `async`/returns a promise.
The destructured `isPending` is also discarded (`const [, startSaveTransition]`), so this hook
currently does nothing observable; it reads as intentional but doesn't achieve whatever
deprioritization was presumably intended.

**Fix:** Either drop `useTransition` entirely (a plain function call would behave identically), or
make the callback `async` and `await` the settle-and-setState sequence so React can actually track
it, and consume `isPending` somewhere if the goal is to deprioritize this update.

### IN-02: No validation or friendly failure when `DATABASE_URL` is missing

**File:** `lib/db/client.ts:12`

**Issue:** `const sql = neon(process.env.DATABASE_URL!);` runs at module load with a non-null
assertion and no guard. Any environment missing the variable fails with whatever error the Neon
client happens to throw for an `undefined` connection string, rather than a clear
configuration-error message pointing at the missing env var.

**Fix:** A small explicit check (`if (!process.env.DATABASE_URL) throw new Error("DATABASE_URL is
not set")`) gives a much clearer signal than an assertion that silently becomes `undefined` at
runtime.

---

_Reviewed: 2026-08-28T01:32:30Z_
_Reviewer: Claude (gsd-code-reviewer)_
_Depth: standard_
