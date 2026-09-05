/**
 * Units preference boundary — mirrors `lib/theme.ts`'s shape (storage key, parse-with-fallback,
 * deliberately DOM-free) with the one divergence D-10 requires: theme always resolves to a real
 * value (`system` as its own fallback); a units preference has to represent "nothing chosen
 * yet" everywhere it lives, so `parseUnitsPreference` returns `null`, never a default. The
 * rendering default (Imperial) is applied by the caller through `resolveUnitsSystem`, which is
 * the one place "nothing stored" becomes a screen.
 *
 * Every stored value — cookie, localStorage, and (from 05-02) the account column — is treated
 * as untrusted input: `parseUnitsPreference` is an allow-list against the two members of
 * `UNITS_SYSTEMS` and nothing else. It never interprets, evaluates, or trusts what it is
 * handed (T-05-01/T-05-02 in this plan's threat register).
 */

import { UNITS_SYSTEMS, type UnitsSystem } from "./geometry/units";

export const UNITS_STORAGE_KEY = "shaper-units";
export const UNITS_COOKIE_NAME = "shaper-units";
/** One year, matching the theme cookie precedent — long enough that a shaper's pick survives
 * between visits without needing a renewal mechanic. */
export const UNITS_COOKIE_MAX_AGE_SECONDS = 31_536_000;
export const DEFAULT_UNITS_SYSTEM: UnitsSystem = "imperial";

/**
 * Reads a stored value back into a units system, or `null` for anything absent or
 * unrecognised — a hand-edited localStorage entry, a stale cookie, an empty string, or any
 * value outside the two registered systems. Never a silent default (D-10): the caller decides
 * what "no preference" renders as.
 */
export function parseUnitsPreference(value: unknown): UnitsSystem | null {
  return typeof value === "string" && (UNITS_SYSTEMS as readonly string[]).includes(value)
    ? (value as UnitsSystem)
    : null;
}

/** What a preference actually renders as — the one place the Imperial default is applied. */
export function resolveUnitsSystem(preference: UnitsSystem | null): UnitsSystem {
  return preference ?? DEFAULT_UNITS_SYSTEM;
}

/**
 * The `document.cookie` assignment string for a units pick. No `Secure` (so it still works on
 * `http://localhost:3000`); no `HttpOnly` (the browser is the writer, and the value carries
 * nothing sensitive — see T-05-03, "accept" disposition).
 */
export function unitsCookieString(system: UnitsSystem): string {
  return `${UNITS_COOKIE_NAME}=${system}; Path=/; Max-Age=${UNITS_COOKIE_MAX_AGE_SECONDS}; SameSite=Lax`;
}

/**
 * Reads the units cookie out of a raw `Cookie` request header (or `document.cookie`'s own
 * string shape), running its value through the same allow-list `parseUnitsPreference` uses.
 * Returns `null` for a missing header, an absent cookie, or a junk value — never throws.
 */
export function readUnitsCookie(cookieHeader: string | null | undefined): UnitsSystem | null {
  if (!cookieHeader) return null;
  for (const part of cookieHeader.split(";")) {
    const eq = part.indexOf("=");
    if (eq === -1) continue;
    const name = part.slice(0, eq).trim();
    if (name !== UNITS_COOKIE_NAME) continue;
    let raw: string;
    try {
      raw = decodeURIComponent(part.slice(eq + 1).trim());
    } catch {
      return null;
    }
    return parseUnitsPreference(raw);
  }
  return null;
}

/**
 * The result of reconciling an account value against a browser value at sign-in/sign-out —
 * UNIT-04's whole rule, encoded once so both this plan (browser only) and 05-02 (account too)
 * read from the same decision.
 */
export interface UnitsHandoff {
  /** The system this render/session should actually show. */
  system: UnitsSystem;
  /** Non-null when the account's value should be written into the browser (localStorage +
   * cookie) — the account always wins on sign-in, so this fires whenever an account value is
   * present, regardless of what the browser already held. The caller (the units provider)
   * decides whether an actual write is needed by comparing against what is already stored. */
  adoptIntoBrowser: UnitsSystem | null;
  /** Non-null when an explicit browser pick should be written to an empty account. Never
   * non-null when `account` was non-null — that single condition is what stops a browser from
   * overwriting a real choice made on another device. */
  promoteToAccount: UnitsSystem | null;
}

/**
 * UNIT-04's handoff rule (D-09, D-10), in full:
 * - Signed in with an account value: the account wins outright, adopted into the browser,
 *   nothing promoted — regardless of what the browser held (including a different explicit
 *   value).
 * - Signed in with no account value but an explicit browser value: the browser's system,
 *   nothing adopted, promoted to the account.
 * - Signed in with neither: Imperial, nothing adopted, nothing promoted — a default nobody
 *   chose is never written to an account.
 * - Signed out with a browser value: that system, nothing adopted, nothing promoted.
 * - Signed out with no browser value: Imperial, nothing adopted, nothing promoted.
 *
 * This plan only ever calls this with `signedIn: false` (`lib/units-server.ts`); 05-02 supplies
 * real `signedIn`/`account` values without this function's shape changing.
 */
export function decideUnitsHandoff(input: {
  signedIn: boolean;
  account: UnitsSystem | null;
  browser: UnitsSystem | null;
}): UnitsHandoff {
  const { signedIn, account, browser } = input;

  if (signedIn && account !== null) {
    return { system: account, adoptIntoBrowser: account, promoteToAccount: null };
  }
  if (signedIn && browser !== null) {
    return { system: browser, adoptIntoBrowser: null, promoteToAccount: browser };
  }
  if (!signedIn && browser !== null) {
    return { system: browser, adoptIntoBrowser: null, promoteToAccount: null };
  }
  return { system: DEFAULT_UNITS_SYSTEM, adoptIntoBrowser: null, promoteToAccount: null };
}

/**
 * The background account write's retry schedule (D-11): roughly one second, four seconds, then
 * fifteen seconds. A units pick is a single discrete click, not a stream of slider drags, so
 * there is no debounce here — only this bounded ladder. It is bounded on purpose: between the
 * push to `main` and the production migration (05-07), the `user_preferences` table does not
 * exist yet, and an unbounded retry would hammer the database for every shaper who touches the
 * chooser during that window. Once the ladder is exhausted the write gives up quietly — no
 * toast, no banner, nothing the shaper ever sees (D-11).
 */
export const UNITS_WRITE_RETRY_DELAYS_MS: readonly number[] = [1_000, 4_000, 15_000];

/**
 * The delay before the next retry attempt, or `null` once the ladder is exhausted. `attempt` is
 * the zero-based count of retries already made (0 before the first retry, 1 before the second,
 * and so on) — a negative attempt floors to the first rung rather than throwing, the same
 * defensive-floor discipline the rest of this module uses for untrusted input.
 */
export function nextUnitsWriteRetryDelayMs(attempt: number): number | null {
  const index = Math.max(attempt, 0);
  return index < UNITS_WRITE_RETRY_DELAYS_MS.length ? UNITS_WRITE_RETRY_DELAYS_MS[index] : null;
}

/**
 * The account write's serialization policy (WR-01 fix), pure and tested the same way
 * `lib/models/autosave.ts` keeps `decideAutosave`/`nextStatusAfter` pure while the component only
 * wires a timer to them. A token only stops a stale *retry*; it does nothing about two overlapping
 * first attempts completing out of order. So instead of a token, this queue guarantees the
 * property that actually matters: at most one `save` call is ever in flight, and the last pick
 * always lands last.
 *
 * `request(system)` is called on every pick (and once for the 05-02 account-promotion write).
 * It always records `system` as the "desired" value. If nothing is in flight, it starts a write
 * immediately (after cancelling any pending retry timer and resetting the attempt count — a
 * fresh pick means a fresh ladder). If a write is already in flight, `request` does nothing else:
 * the in-flight write's own completion handler re-reads the desired value once it settles.
 *
 * When a write settles — success or failure — the desired value is checked again:
 * - If the desired value now differs from what was just written, a fresh attempt (attempt count
 *   reset to 0) starts for the desired value, regardless of whether the just-settled write
 *   succeeded or failed. This is what makes "the last pick always lands last" true even when two
 *   picks race a slow network: the newer pick's write never has to out-race the older one, it
 *   simply starts after the older one is done, however it finished.
 * - Only when the desired value still equals the value that just failed does the bounded retry
 *   ladder (`nextUnitsWriteRetryDelayMs`) apply, on its own timer.
 * - Once the ladder is exhausted for a value that is still desired, the write is abandoned
 *   silently for the shaper (D-11) but logged once for an operator (WR-03), mirroring the
 *   read-side logging in `lib/units-server.ts`.
 */
export interface UnitsWriteQueueDeps {
  /** The Server Action call itself — `app/actions/units.ts`'s `saveUnitsPreference` in
   * production, a fake promise-returning function in tests. */
  save: (system: UnitsSystem) => Promise<void>;
  /** `setTimeout` in production, a fake recording scheduler in tests — this module never reaches
   * for a browser global directly, so it can be driven deterministically without fake timers. */
  setTimer: (callback: () => void, delayMs: number) => unknown;
  /** `clearTimeout` in production, paired with whatever handle `setTimer` returned. */
  clearTimer: (handle: unknown) => void;
}

export interface UnitsWriteQueue {
  /** Records `system` as the value the account should end up holding, and starts or continues
   * writing towards it. Safe to call on every pick — never throws, never blocks the caller. */
  request(system: UnitsSystem): void;
  /** Cancels any pending retry timer. Call on unmount — nothing should keep firing after the
   * provider using this queue is gone. */
  dispose(): void;
}

export function createUnitsWriteQueue(deps: UnitsWriteQueueDeps): UnitsWriteQueue {
  const { save, setTimer, clearTimer } = deps;

  let desired: UnitsSystem | null = null;
  let inFlight = false;
  let attempt = 0;
  let pendingTimer: unknown = null;

  function clearPendingTimer() {
    if (pendingTimer !== null) {
      clearTimer(pendingTimer);
      pendingTimer = null;
    }
  }

  function startAttempt(system: UnitsSystem) {
    inFlight = true;
    save(system).then(
      () => {
        inFlight = false;
        // Success settles `system`, not necessarily `desired` — a pick made while this write was
        // in flight only recorded itself in `desired`; it never fired its own overlapping call.
        if (desired !== null && desired !== system) {
          attempt = 0;
          startAttempt(desired);
        }
      },
      (error: unknown) => {
        inFlight = false;
        if (desired !== system) {
          // Superseded while in flight — the failed value is no longer wanted, so the ladder
          // for it is irrelevant. Start fresh for whatever is actually desired now.
          attempt = 0;
          if (desired !== null) startAttempt(desired);
          return;
        }
        const delay = nextUnitsWriteRetryDelayMs(attempt);
        attempt += 1;
        if (delay === null) {
          // Ladder exhausted for a value still desired — shaper-facing silence stays intact
          // (D-11: no toast, no banner), but an operator needs something to grep for if this
          // keeps happening outside the expected pre-migration window (mirrors the read-side
          // logging in lib/units-server.ts).
          console.error("Shaper: failed to save units preference after exhausting retries", error);
          return;
        }
        pendingTimer = setTimer(() => {
          pendingTimer = null;
          startAttempt(system);
        }, delay);
      },
    );
  }

  return {
    request(system: UnitsSystem) {
      desired = system;
      clearPendingTimer();
      if (inFlight) return; // the in-flight write's completion handler will re-check `desired`
      attempt = 0;
      startAttempt(system);
    },
    dispose() {
      clearPendingTimer();
    },
  };
}
