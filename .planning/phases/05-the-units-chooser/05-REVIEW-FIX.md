---
phase: 05-the-units-chooser
fixed_at: 2026-09-04T19:36:00Z
review_path: .planning/phases/05-the-units-chooser/05-REVIEW.md
iteration: 1
findings_in_scope: 5
fixed: 5
skipped: 0
status: all_fixed
---

# Phase 05: Code Review Fix Report

**Fixed at:** 2026-09-04
**Source review:** `.planning/phases/05-the-units-chooser/05-REVIEW.md`
**Iteration:** 1

**Summary:**
- Findings in scope: 5 (3 warnings, 2 info — `fix_scope: all`)
- Fixed: 5
- Skipped: 0

## Fixed Issues

### WR-01: Concurrent unit picks can let an older write land after a newer one, silently reverting the account's stored preference

**Files modified:** `lib/units-preference.ts`, `lib/units-preference.test.ts`, `components/units-provider.tsx`
**Commit:** `09bb8fa`
**Applied fix:** The reviewer's own sketch (a token that drops a stale *retry*) only closes half the
hole — it does nothing about two overlapping *first* attempts finishing out of order over a slow
network. Instead of a token, the account write now goes through a small pure queue
(`createUnitsWriteQueue` in `lib/units-preference.ts`) that guarantees at most one
`saveUnitsPreference` call is ever in flight and that the shaper's last pick always lands last:
every pick records a "desired" value; if a write is already in flight nothing new is sent (the
in-flight write's own completion handler re-checks `desired` once it settles, whether it
succeeded or failed); only when the value that just failed is still the desired one does the
bounded retry ladder (`nextUnitsWriteRetryDelayMs`) apply. `components/units-provider.tsx` now
only supplies the real Server Action and real `setTimeout`/`clearTimeout` to that queue via a ref,
and calls `dispose()` on unmount — the same "policy is pure and tested, the component only wires
timers" split this codebase already uses for `lib/models/autosave.ts`. Five new tests in
`lib/units-preference.test.ts` drive the queue with fake save promises and a fake scheduler and
prove: a second pick made while the first write is in flight results in exactly one more write for
the newer value once the first settles (both when it succeeds and when it fails); a rejected write
whose value is still desired retries on the ladder and gives up after it's exhausted; a pick that
changes the desired value cancels a pending retry timer; and `dispose()` cancels a pending timer.
For a shaper, this means quickly comparing Imperial and Metric in the still-open Units menu can no
longer make their account remember the wrong one, on any device, on their next sign-in.

### WR-03: Read failures are logged, write failures never are

**Files modified:** `lib/units-preference.ts`, `lib/units-preference.test.ts`
**Commit:** `441439a`
**Applied fix:** Added one `console.error("Shaper: failed to save units preference after
exhausting retries", error)` inside the write queue's abandonment path, at the exact point the
retry ladder returns `null` — mirroring the existing read-side logging in
`lib/units-server.ts`. Extended the retry-ladder test to assert the log fires exactly once, only
after all three rungs are exhausted, and never fires while a retry is still pending. The shaper
still never sees a toast or a banner (D-11 unchanged); an operator now has something to grep for
in server logs if account writes keep failing for a reason other than the expected
pre-migration window.

### WR-02: Post-hydration "blink" of the wrong units system whenever localStorage disagrees with the server-resolved system

**Files modified:** `components/units-provider.tsx`, `app/layout.tsx`
**Commit:** `73c8d7e`
**Applied fix:** Implemented option (b) from the reviewer's fix suggestion, per the orchestrator's
design guidance: added a `reconciledRef`, initialized to `true` when `handoff.adoptIntoBrowser ===
null` (signed out, or no account value — unchanged behavior) and `false` otherwise. `getSnapshot`
now returns `handoff.system` unconditionally while `reconciledRef.current` is `false`, and only
reads localStorage once it flips to `true`. The flag flips to `true`, followed by
`emitPreferenceChange()`, in exactly two places: at the end of the account-adoption effect
(including its early-return branch where storage already agreed with the account — it still needs
to flip and emit, since it started `false`), and inside `setSystem` before the emit (a shaper's own
click always wins immediately, reconciled or not). `getSnapshot` itself stays pure — it only reads
the ref and localStorage, never writes the ref. Updated the doc comment at the top of
`components/units-provider.tsx` and the comment beside `<UnitsProvider>` in `app/layout.tsx` (which
previously implied the client and server snapshots always agree) to describe this honestly.

**This fix could not be unit-tested in the node vitest environment** — it depends on
`useSyncExternalStore`'s mount-time client re-check racing an effect, which requires a real DOM/React
render cycle vitest's node environment does not provide. **Manual verification needed:** sign in as
a shaper whose account holds one system (e.g. Metric), with the browser's localStorage still
holding the other system (e.g. `imperial`, left over from an earlier or different session), then
reload the page — the numbers should read Metric from the very first frame with no visible blink
to Imperial before settling. This is the scenario the reviewer identified; it has not been
re-run in a real browser as part of this fix pass.

### IN-01: Duplicate `import` statements from the same module

**Files modified:** `lib/db/queries.ts`
**Commit:** `f84673a`
**Applied fix:** Merged `import { desc } from "drizzle-orm"; import { eq } from "drizzle-orm";`
into a single `import { desc, eq } from "drizzle-orm";`. No behavior change — the board rack list
and the units preference read work exactly as before.

### IN-02: `console.error` in the pre-migration window will be noisy for every signed-in page load

**Files modified:** none
**Commit:** none (no code change required, per the review's own fix note)
**Note recorded:** Between pushing this phase to `main` and running `npm run db:migrate:prod`, every
signed-in page load will log one `console.error` line from `resolveUnitsHandoff` (the
`user_preferences` table not existing yet). This is expected, correct behavior — the page never
breaks — and should not be mistaken for a new production problem when it shows up in Vercel logs
right after this ships.

## Skipped Issues

None — all five in-scope findings were fixed.

## Verification

Ran in the main checkout (`/Users/kontoes/Code/shaper`, branch `main`) — no isolated worktree was
used for this fix pass (working tree was clean at the start; the orchestrator directed edits and
commits directly here), so these results are reproducible from the tree as committed:

- `npx vitest run` — 30 test files, 1901 passed, 2 skipped (pre-existing skips, unrelated to this
  phase), 0 failed. Includes 5 new tests for the write queue and all 30 pre-existing suites,
  including `lib/units-isolation.test.ts` (still green — the units preference/provider modules
  gained no import from `components/design/design-store.tsx` or `lib/models/design-snapshot.ts`,
  and `lib/geometry/units.ts`/`lib/geometry/summary-line.ts` stayed pure).
- `npx tsc --noEmit` — clean, no errors.
- `npm run lint` — no new errors or warnings in any file this fix pass touched
  (`lib/units-preference.ts`, `lib/units-preference.test.ts`, `components/units-provider.tsx`,
  `app/layout.tsx`, `lib/db/queries.ts`); confirmed both by targeted `eslint` runs on exactly those
  files (clean) and by inspecting the full `npm run lint` output, whose remaining 41 errors/45
  warnings are all pre-existing, confined to `reference/` (the vendored prototype), `scripts/`
  (golden-fixture extractors), `lib/geometry/outline.test.ts`, and files inside an unrelated
  executor worktree directory (`.claude/worktrees/determined-tereshkova-590f1b/`) left over from a
  different session.
- `npm run build` was intentionally not run — the orchestrator runs it.

---

_Fixed: 2026-09-04_
_Fixer: Claude (gsd-code-fixer)_
_Iteration: 1_
