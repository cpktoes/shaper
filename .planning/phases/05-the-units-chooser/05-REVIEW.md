---
phase: 05-the-units-chooser
reviewed: 2026-09-04T00:00:00Z
depth: standard
files_reviewed: 29
files_reviewed_list:
  - app/actions/units.ts
  - app/layout.tsx
  - components/design/slider-row.test.ts
  - components/design/slider-row.tsx
  - components/fins/fin-controls.tsx
  - components/outline/outline-controls.tsx
  - components/outline/outline-editor.tsx
  - components/rails/rail-controls.tsx
  - components/rocker/rocker-controls.tsx
  - components/rocker/rocker-editor.tsx
  - components/settings-menu.tsx
  - components/setup/board-rack-card.tsx
  - components/setup/card-metadata-line.tsx
  - components/setup/preset-card.tsx
  - components/units-provider.tsx
  - components/viewer/toolbar-button.test.ts
  - components/viewer/toolbar-button.tsx
  - components/volume/volume-controls.tsx
  - drizzle/0002_tearful_vanisher.sql
  - lib/db/ownership.test.ts
  - lib/db/queries.ts
  - lib/db/schema.ts
  - lib/geometry/summary-line.test.ts
  - lib/geometry/summary-line.ts
  - lib/geometry/units.test.ts
  - lib/geometry/units.ts
  - lib/units-isolation.test.ts
  - lib/units-preference.test.ts
  - lib/units-preference.ts
  - lib/units-server.ts
findings:
  critical: 0
  warning: 3
  info: 2
  total: 5
status: issues_found
---

# Phase 05: Code Review Report

**Reviewed:** 2026-09-04
**Depth:** standard
**Files Reviewed:** 29 (one test file listed twice in the original file set — `lib/geometry/units.test.ts` — counted once)
**Status:** issues_found

## Summary

This phase adds an Imperial/Metric units chooser: a browser-level preference (cookie +
localStorage) plus an account-level preference (`user_preferences` table, keyed on the Clerk
user id), reconciled server-side in `app/layout.tsx` via `lib/units-server.ts` so first paint is
correct, with a client `UnitsProvider` that mirrors picks into storage and fires a
best-effort/bounded-retry write to the account. Two refactors (`SliderRow`, `ViewerToolbarButton`)
ride along and are guarded by source-contract tests.

The security-sensitive surfaces called out in the task brief hold up:
- `parseUnitsPreference` allow-lists every untrusted input (cookie, localStorage, DB column)
  against the two registered systems; nothing is ever trusted or evaluated.
- `app/actions/units.ts`'s `saveUnitsPreference` derives identity from `await auth()` only,
  never accepts a caller-supplied owner id, and re-validates its `system` argument at runtime
  (a compile-time-only guarantee is not enough — a crafted POST to the Server Action's endpoint
  is exactly what this checks against), all mechanically enforced by
  `lib/db/ownership.test.ts`.
- Both the account read (`lib/units-server.ts`) and the account write
  (`app/actions/units.ts` → caught in `components/units-provider.tsx`) degrade silently when the
  `user_preferences` table doesn't exist yet — the window between pushing to `main` and running
  `db:migrate:prod` is handled correctly on both the read and write paths, and nothing here can
  reach or mutate the `models` table (a saved board). `lib/units-isolation.test.ts` further pins
  that the units preference has no path into design state or the saved snapshot, so switching
  units and back can never perturb a saved board's numbers.
- All five sidebar refactors (`SliderRow` extraction) and the two-screen toolbar-button
  extraction were checked line-by-line against `git diff` and are faithful — same bounds, same
  conversions, same disabled-opacity values, same slot offsets. No regression found there.

The two real findings below are both about the client-side reconciliation logic in
`components/units-provider.tsx` — a genuine race in the account-write retry path, and a
hydration-time flash that undercuts this phase's own stated goal ("never a blink of inches",
D-12) for the exact scenario (a signed-in shaper's browser disagreeing with their account) the
account-sync half of this feature exists to serve. Neither can corrupt a saved board or leak
data; both are quality/correctness gaps in the new code.

## Warnings

### WR-01: Concurrent unit picks can let an older write land after a newer one, silently reverting the account's stored preference

**File:** `components/units-provider.tsx:104-124` (`scheduleAccountWrite`)
**Issue:** `setSystem` calls `scheduleAccountWrite(next)` on every pick. That function cancels a
pending **retry timeout** and resets the attempt counter, but it does not cancel or supersede an
**already in-flight** `saveUnitsPreference()` call from a previous pick. Because the Units menu
keeps itself open after a click (`closeOnClick={false}` in `components/settings-menu.tsx`,
deliberately, so a shaper can compare before closing), quickly toggling between Imperial and
Metric — a natural thing to do while comparing the live example — fires two concurrent Server
Action calls. If the network responses resolve out of order, the account's stored value ends up
as whatever call's response arrived last, which is not necessarily the shaper's final on-screen
pick.

This matters beyond a single session: `decideUnitsHandoff` (`lib/units-preference.ts:107-124`)
makes the **account value always win on sign-in**, unconditionally overwriting the browser's own
value (`adoptIntoBrowser` fires whenever `account !== null`, "regardless of what the browser
held"). So a reverted account write doesn't just create a one-session discrepancy — it can
silently flip a shaper's units back on their *next* sign-in, on any device, with no error ever
shown (by design, per D-11).
**Fix:** Give each write a monotonically increasing token and drop the response of any write that
isn't the latest in flight, e.g.:
```ts
const writeTokenRef = useRef(0);

const scheduleAccountWrite = useCallback((next: UnitsSystem) => {
  if (pendingWriteTimeoutRef.current !== null) {
    clearTimeout(pendingWriteTimeoutRef.current);
    pendingWriteTimeoutRef.current = null;
  }
  writeAttemptRef.current = 0;
  const token = ++writeTokenRef.current;

  const attemptWrite = () => {
    saveUnitsPreference(next).catch(() => {
      if (writeTokenRef.current !== token) return; // superseded by a newer pick — drop it
      const delay = nextUnitsWriteRetryDelayMs(writeAttemptRef.current);
      writeAttemptRef.current += 1;
      if (delay === null) return;
      pendingWriteTimeoutRef.current = setTimeout(attemptWrite, delay);
    });
  };
  attemptWrite();
}, []);
```
This only prevents a stale *retry* from continuing; the underlying out-of-order-completion race
on the very first attempt of two overlapping picks is a smaller residual risk, but is naturally
resolved because the server-side write is a plain upsert with no way to know which pick was
"newer" — the real fix has to be client-side sequencing like the token above, or a
last-write-wins timestamp compared server-side.

### WR-02: Post-hydration "blink" of the wrong units system whenever localStorage disagrees with the server-resolved system — the scenario this feature is built to handle

**File:** `components/units-provider.tsx:92-95`, `app/layout.tsx:91-97`
**Issue:** `getServerSnapshot` returns `handoff.system` (what the server resolved — the account
value when signed in with one, per `decideUnitsHandoff`). `getSnapshot` (the client-side
function) returns `getStoredPreference() ?? handoff.system` — i.e. it prefers **localStorage**
over the server's resolved value. `useSyncExternalStore` uses `getServerSnapshot` to render
during hydration (so the first paint matches the SSR HTML, no visible mismatch there), but React
also schedules a passive effect after mount (`updateStoreInstance` in React's own
implementation) that re-invokes the **client** `getSnapshot()` and force-rerenders if it differs
from the value used to hydrate. Whenever localStorage disagrees with `handoff.system`, this
happens deterministically, not just as a rare race.

This is exactly the situation the account-sync half of this phase is designed around: a shaper
picks Metric on one device (account updated); their phone or another browser still has
`imperial` cached in localStorage from a previous, signed-out (or earlier) session. On sign-in
there, the server correctly resolves and renders `metric` (account wins) — but the mount-time
re-check reads the stale `imperial` from localStorage and forces a re-render to `imperial` before
the `adoptIntoBrowser` effect (which runs after this) corrects localStorage back to `metric` and
emits another update. The net effect is a metric → imperial → metric flash immediately after
load, i.e. a shaper briefly sees the *wrong* board dimensions on the very code path this feature
was built to keep correct. The same mismatch can also be triggered by anyone whose browser
allows localStorage but blocks or has cleared cookies (Safari private-mode-style configurations,
or a shaper who cleared cookies but not site storage).

The `app/layout.tsx` docstring for this wiring states plainly that "the server snapshot above is
already correct, so there is nothing to patch before paint the way `THEME_INIT_SCRIPT` patches a
stale dark-theme class" — this assumes client storage and the server's resolution always agree,
which is not guaranteed for a signed-in shaper switching devices (the primary reason the account
column exists at all).
**Fix:** Either (a) make `getSnapshot` agree with `getServerSnapshot` when signed in with an
account value — e.g. thread whether the account "owns" the value through the handoff and have
`getSnapshot` prefer `handoff.system` over localStorage in that case, only falling back to
localStorage when there is no account value to defer to — or (b) accept the account is
authoritative and have `getSnapshot` simply return `handoff.system` unconditionally on first
mount (using a ref to "freeze" the snapshot until the `adoptIntoBrowser`/promote effects have had
a chance to reconcile storage), then switch to reading localStorage only after that
reconciliation pass runs.

### WR-03: Read failures are logged, write failures never are — no way to tell after the fact whether the pre-migration window (or a real DB problem later) caused silent data loss for a shaper's account preference

**File:** `components/units-provider.tsx:111-122` (`attemptWrite`), compare `lib/units-server.ts:31-36`
**Issue:** `resolveUnitsHandoff` logs a failed account **read** with `console.error`. The
account **write** path in `units-provider.tsx` never logs anything, even once the retry ladder is
fully exhausted and the write is abandoned for good (`nextUnitsWriteRetryDelayMs` returns `null`).
This is by design for the *shaper-facing* side (D-11: no toast, no banner), but there is
currently no operator-facing signal either — if writes are silently failing in production for a
reason other than the expected pre-migration window (e.g. a real outage, a schema drift, a
permissions issue), there will be no trace of it anywhere.
**Fix:** Add a single `console.error` (or equivalent structured log) at the point the retry
ladder is exhausted, mirroring the read-side logging already present in `lib/units-server.ts` —
this keeps the shaper-facing silence intact while giving ops something to grep for.

## Info

### IN-01: Duplicate `import` statements from the same module

**File:** `lib/db/queries.ts:11-12`
**Issue:**
```ts
import { desc } from "drizzle-orm";
import { eq } from "drizzle-orm";
```
Two separate import declarations from the same specifier.
**Fix:** `import { desc, eq } from "drizzle-orm";`

### IN-02: `console.error` in the pre-migration window will be noisy for every signed-in page load

**File:** `lib/units-server.ts:29-36`
**Issue:** Until `npm run db:migrate:prod` is run, `readUnitsPreference` will throw for every
signed-in request (the `user_preferences` table does not exist yet), and `resolveUnitsHandoff`
logs each one via `console.error`. This is the correct behavior for correctness (the page must
never break), but it means every signed-in page view during the deploy → migrate window adds a
server log line — worth knowing about ahead of time so it isn't mistaken for a new production
problem when it shows up in Vercel logs right after this ships.
**Fix:** No code change required; noting this so it isn't misdiagnosed. If log volume during that
window is a concern, consider a rate-limited or debug-level log instead of `console.error`.

---

_Reviewed: 2026-09-04_
_Reviewer: Claude (gsd-code-reviewer)_
_Depth: standard_
