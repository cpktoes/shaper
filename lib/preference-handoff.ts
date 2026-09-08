/**
 * The rules every per-shaper account preference follows, generalized once out of
 * `lib/units-preference.ts`'s `decideUnitsHandoff`/`createUnitsWriteQueue` (RESEARCH.md Pattern
 * 3, CONTEXT.md's `add-alongside` decision). Units and the print-instructions toggle are two
 * *instances* of the same shape — a value that lives on the account, mirrored in the browser,
 * reconciled the same five ways at sign-in — so the rules live here once and both preference
 * modules call through to them, rather than each re-deriving (and each risking re-introducing) the
 * same five edge cases (WR-01/WR-02, per STATE.md's decision log).
 *
 * No React, no browser global, no database import — this module is exactly as pure as the units
 * module it was extracted from.
 */

/**
 * The result of reconciling an account value against a browser value at sign-in/sign-out —
 * generalized over any value type `T`. Mirrors `UnitsHandoff` field-for-field.
 */
export interface PreferenceHandoff<T> {
  /** The value this render/session should actually show. */
  value: T;
  /** Non-null when the account's value should be written into the browser (localStorage +
   * cookie) — the account always wins on sign-in, so this fires whenever an account value is
   * present, regardless of what the browser already held. */
  adoptIntoBrowser: T | null;
  /** Non-null when an explicit browser pick should be written to an empty account. Never
   * non-null when `account` was non-null — that single condition is what stops a browser from
   * overwriting a real choice made on another device. */
  promoteToAccount: T | null;
}

/**
 * The handoff rule, in full, for any preference value type `T`:
 * - Signed in with an account value: the account wins outright, adopted into the browser,
 *   nothing promoted — regardless of what the browser held (including a different explicit
 *   value).
 * - Signed in with no account value but an explicit browser value: the browser's value, nothing
 *   adopted, promoted to the account.
 * - Signed in with neither: `fallback`, nothing adopted, nothing promoted — a default nobody
 *   chose is never written to an account.
 * - Signed out with a browser value: that value, nothing adopted, nothing promoted.
 * - Signed out with no browser value: `fallback`, nothing adopted, nothing promoted.
 */
export function decidePreferenceHandoff<T>(input: {
  signedIn: boolean;
  account: T | null;
  browser: T | null;
  fallback: T;
}): PreferenceHandoff<T> {
  const { signedIn, account, browser, fallback } = input;

  if (signedIn && account !== null) {
    return { value: account, adoptIntoBrowser: account, promoteToAccount: null };
  }
  if (signedIn && browser !== null) {
    return { value: browser, adoptIntoBrowser: null, promoteToAccount: browser };
  }
  if (!signedIn && browser !== null) {
    return { value: browser, adoptIntoBrowser: null, promoteToAccount: null };
  }
  return { value: fallback, adoptIntoBrowser: null, promoteToAccount: null };
}

/**
 * The background account write's retry schedule: roughly one second, four seconds, then fifteen
 * seconds. A preference pick is a single discrete click, not a stream of slider drags, so there
 * is no debounce here — only this bounded ladder. It is bounded on purpose: between a code push
 * and a production migration, the column a write targets may not exist yet, and an unbounded
 * retry would hammer the database for every shaper who picks during that window. Once the ladder
 * is exhausted the write gives up quietly — no toast, no banner, nothing the shaper ever sees.
 */
export const PREFERENCE_WRITE_RETRY_DELAYS_MS: readonly number[] = [1_000, 4_000, 15_000];

/**
 * The delay before the next retry attempt, or `null` once the ladder is exhausted. `attempt` is
 * the zero-based count of retries already made (0 before the first retry, 1 before the second,
 * and so on) — a negative attempt floors to the first rung rather than throwing.
 */
export function nextPreferenceWriteRetryDelayMs(attempt: number): number | null {
  const index = Math.max(attempt, 0);
  return index < PREFERENCE_WRITE_RETRY_DELAYS_MS.length ? PREFERENCE_WRITE_RETRY_DELAYS_MS[index] : null;
}

/**
 * The account write's serialization policy, generalized over any value type `T`: at most one
 * `save` call is ever in flight, and the last pick always lands last.
 *
 * `request(value)` is called on every pick (and once for an account-promotion write). It always
 * records `value` as the "desired" value. If nothing is in flight, it starts a write immediately
 * (after cancelling any pending retry timer and resetting the attempt count — a fresh pick means
 * a fresh ladder). If a write is already in flight, `request` does nothing else: the in-flight
 * write's own completion handler re-reads the desired value once it settles.
 *
 * When a write settles — success or failure — the desired value is checked again:
 * - If the desired value now differs from what was just written, a fresh attempt (attempt count
 *   reset to 0) starts for the desired value, regardless of whether the just-settled write
 *   succeeded or failed.
 * - Only when the desired value still equals the value that just failed does the bounded retry
 *   ladder apply, on its own timer.
 * - Once the ladder is exhausted for a value that is still desired, the write is abandoned
 *   silently for the shaper but logged once for an operator.
 */
export interface PreferenceWriteQueueDeps<T> {
  /** The Server Action call itself, or a fake promise-returning function in tests. */
  save: (value: T) => Promise<void>;
  /** `setTimeout` in production, a fake recording scheduler in tests — this module never reaches
   * for a browser global directly, so it can be driven deterministically without fake timers. */
  setTimer: (callback: () => void, delayMs: number) => unknown;
  /** `clearTimeout` in production, paired with whatever handle `setTimer` returned. */
  clearTimer: (handle: unknown) => void;
}

export interface PreferenceWriteQueue<T> {
  /** Records `value` as the value the account should end up holding, and starts or continues
   * writing towards it. Safe to call on every pick — never throws, never blocks the caller. */
  request(value: T): void;
  /** Cancels any pending retry timer. Call on unmount — nothing should keep firing after the
   * provider using this queue is gone. */
  dispose(): void;
}

export function createPreferenceWriteQueue<T>(deps: PreferenceWriteQueueDeps<T>): PreferenceWriteQueue<T> {
  const { save, setTimer, clearTimer } = deps;

  let desired: T | null = null;
  let hasDesired = false;
  let inFlight = false;
  let attempt = 0;
  let pendingTimer: unknown = null;

  function clearPendingTimer() {
    if (pendingTimer !== null) {
      clearTimer(pendingTimer);
      pendingTimer = null;
    }
  }

  function startAttempt(value: T) {
    inFlight = true;
    save(value).then(
      () => {
        inFlight = false;
        // Success settles `value`, not necessarily `desired` — a pick made while this write was
        // in flight only recorded itself in `desired`; it never fired its own overlapping call.
        if (hasDesired && desired !== value) {
          attempt = 0;
          startAttempt(desired as T);
        }
      },
      (error: unknown) => {
        inFlight = false;
        if (!hasDesired || desired !== value) {
          // Superseded while in flight — the failed value is no longer wanted, so the ladder
          // for it is irrelevant. Start fresh for whatever is actually desired now.
          attempt = 0;
          if (hasDesired) startAttempt(desired as T);
          return;
        }
        const delay = nextPreferenceWriteRetryDelayMs(attempt);
        attempt += 1;
        if (delay === null) {
          // Ladder exhausted for a value still desired — shaper-facing silence stays intact,
          // but an operator needs something to grep for if this keeps happening outside the
          // expected pre-migration window.
          console.error("Shaper: failed to save preference after exhausting retries", error);
          return;
        }
        pendingTimer = setTimer(() => {
          pendingTimer = null;
          startAttempt(value);
        }, delay);
      },
    );
  }

  return {
    request(value: T) {
      desired = value;
      hasDesired = true;
      clearPendingTimer();
      if (inFlight) return; // the in-flight write's completion handler will re-check `desired`
      attempt = 0;
      startAttempt(value);
    },
    dispose() {
      clearPendingTimer();
    },
  };
}
