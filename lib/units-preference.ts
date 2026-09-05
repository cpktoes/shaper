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
