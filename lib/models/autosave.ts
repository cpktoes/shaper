/**
 * Autosave rules boundary (D-08).
 *
 * This is the only place the question "should an edit write itself to Postgres right now?" is
 * answered. `design-store.tsx` owns the debounce *timer* and the actual `saveModel` call, but the
 * decision of whether to fire, wait, or do nothing lives here, pure and tested — the same
 * separation `lib/geometry/units.ts` draws between "the boundary" and "everywhere else". A
 * component that inlined these checks itself risks silently dropping one (autosaving a
 * never-saved board, or firing twice while a save is already in flight); one tested function
 * cannot drift out of sync with itself.
 *
 * The hard rule this module exists to enforce: a `SaveStatus` of `"saved"` may only ever follow
 * a write the server actually confirmed. `nextStatusAfter` is what makes that true in code — it
 * cannot map a rejected attempt to `"saved"`, so the nav can never lie about whether a shaper's
 * work is safe.
 */

/** The nav Save control's four visual states (D-08, UI-SPEC save-control). */
export type SaveStatus = "idle" | "saving" | "saved" | "error";

/** What `decideAutosave` tells the caller to do next. */
export type AutosaveDecision = "save" | "wait" | "idle";

export interface AutosaveDecisionInput {
  /** Whether the shaper is currently signed in — read from Clerk's `useAuth`. */
  signedIn: boolean;
  /** The store's own `modelId` — null means this board has never been saved (D-08: a board
   * with no home has no autosave target; its first save is the shaper's own deliberate act). */
  modelId: string | null;
  /** True if the store's snapshot fields disagree with the row `modelId` points at. */
  dirty: boolean;
  /** True while a save/autosave `saveModel` call for this board is already in progress. */
  inFlight: boolean;
}

/**
 * Every gate on autosave, in one place:
 * - Signed out: idle. A signed-out shaper has nothing to save to.
 * - Never saved (`modelId === null`): idle, even if dirty and signed in. A board with no home
 *   is saved only by the shaper's own deliberate first Save (D-03/D-08), never automatically.
 * - Not dirty: idle. Nothing has changed since the last confirmed write.
 * - Dirty, signed in, has a home, and a save is already in flight: wait — never two concurrent
 *   writes to one row.
 * - Dirty, signed in, has a home, nothing in flight: save.
 */
export function decideAutosave(input: AutosaveDecisionInput): AutosaveDecision {
  if (!input.signedIn) return "idle";
  if (input.modelId === null) return "idle";
  if (!input.dirty) return "idle";
  if (input.inFlight) return "wait";
  return "save";
}

/**
 * How long the store waits, after the last edit, before firing an autosave (D-08). Picked, not
 * derived: 1200ms sits comfortably inside the 800-3000ms window CONTEXT.md's "Claude's
 * Discretion" leaves open — long enough that dragging a slider (which fires many updates per
 * second) never queues a write per frame, short enough that a shaper who stops and looks away
 * sees the nav settle to "Saved" well before they'd wonder whether it did.
 */
export const AUTOSAVE_DEBOUNCE_MS = 1200;

/**
 * Maps a completed save attempt to the `SaveStatus` the nav shows next. Takes the same shape
 * `Promise.allSettled` produces so the caller never has to translate a try/catch into a status by
 * hand — and, critically, a `"rejected"` attempt can only ever produce `"error"`, never `"saved"`.
 * That is this module's core prohibition, enforced by the type of this function rather than by
 * convention at each call site.
 */
export function nextStatusAfter(result: PromiseSettledResult<unknown>): SaveStatus {
  return result.status === "fulfilled" ? "saved" : "error";
}
