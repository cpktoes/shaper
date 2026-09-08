/**
 * Print-instructions preference boundary — mirrors `lib/units-preference.ts`'s shape one-for-one
 * (PRNT-05, D-07): a nullable boolean, never a silent default. "Never chosen" is a real, distinct
 * state from "chose not to" (RESEARCH.md Pitfall 3), so `parsePrintRailInstructionsPreference`
 * returns `null` for absence and the caller (the provider) is the one place `false` is applied as
 * the rendering default (D-05).
 *
 * Every stored value — cookie, localStorage, and the account column — is treated as untrusted
 * input: the parser is an allow-list against the literal strings `"true"`/`"false"` and the two
 * real booleans, nothing else (T-08-04 in this plan's threat register).
 *
 * The handoff rule itself lives once in `lib/preference-handoff.ts` (Task 3) — this module only
 * supplies the boolean-specific parts (storage keys, the allow-list parser, the fallback value)
 * and calls through to the generic rules, the same way `lib/units-preference.ts` does.
 */

import { decidePreferenceHandoff } from "./preference-handoff";

export const PRINT_RAIL_INSTRUCTIONS_STORAGE_KEY = "shaper-print-rail-instructions";
export const PRINT_RAIL_INSTRUCTIONS_COOKIE_NAME = "shaper-print-rail-instructions";
/** One year, matching the units cookie precedent. */
export const PRINT_RAIL_INSTRUCTIONS_COOKIE_MAX_AGE_SECONDS = 31_536_000;
/** A shaper who never touches the box prints exactly what they print today (D-05) — a default is
 * never written to the account or the browser, but this is what an unresolved render shows. */
export const DEFAULT_PRINT_RAIL_INSTRUCTIONS = false;

/**
 * Reads a stored value back into a boolean, or `null` for anything absent or unrecognised — a
 * hand-edited localStorage entry, a stale cookie, an empty string, or any value outside the two
 * literal strings and the two real booleans. Never a silent default: the caller decides what "no
 * preference" renders as.
 */
export function parsePrintRailInstructionsPreference(value: unknown): boolean | null {
  if (typeof value === "boolean") return value;
  if (value === "true") return true;
  if (value === "false") return false;
  return null;
}

/**
 * The `document.cookie` assignment string for a print-instructions pick. No `Secure` (so it still
 * works on `http://localhost:3000`); no `HttpOnly` (the browser is the writer, and the value
 * carries nothing sensitive).
 */
export function printRailInstructionsCookieString(value: boolean): string {
  return `${PRINT_RAIL_INSTRUCTIONS_COOKIE_NAME}=${value}; Path=/; Max-Age=${PRINT_RAIL_INSTRUCTIONS_COOKIE_MAX_AGE_SECONDS}; SameSite=Lax`;
}

/**
 * Reads the print-instructions cookie out of a raw `Cookie` request header (or `document.cookie`'s
 * own string shape), running its value through the same allow-list
 * `parsePrintRailInstructionsPreference` uses. Returns `null` for a missing header, an absent
 * cookie, or a junk value — never throws.
 */
export function readPrintRailInstructionsCookie(cookieHeader: string | null | undefined): boolean | null {
  if (!cookieHeader) return null;
  for (const part of cookieHeader.split(";")) {
    const eq = part.indexOf("=");
    if (eq === -1) continue;
    const name = part.slice(0, eq).trim();
    if (name !== PRINT_RAIL_INSTRUCTIONS_COOKIE_NAME) continue;
    let raw: string;
    try {
      raw = decodeURIComponent(part.slice(eq + 1).trim());
    } catch {
      return null;
    }
    return parsePrintRailInstructionsPreference(raw);
  }
  return null;
}

/**
 * The result of reconciling an account value against a browser value at sign-in/sign-out — D-07's
 * whole rule, mirroring `UnitsHandoff` exactly.
 */
export interface PrintRailInstructionsHandoff {
  /** Whether this render/session should actually show the box ticked. */
  included: boolean;
  /** Non-null when the account's value should be written into the browser (localStorage +
   * cookie) — the account always wins on sign-in, so this fires whenever an account value is
   * present, regardless of what the browser already held. */
  adoptIntoBrowser: boolean | null;
  /** Non-null when an explicit browser pick should be written to an empty account. Never
   * non-null when `account` was non-null — that single condition is what stops a browser from
   * overwriting a real choice made on another device. */
  promoteToAccount: boolean | null;
}

/**
 * D-07's handoff rule, in full (mirrors `decideUnitsHandoff`):
 * - Signed in with an account value: the account wins outright, adopted into the browser,
 *   nothing promoted — regardless of what the browser held (including a different explicit
 *   value).
 * - Signed in with no account value but an explicit browser value: the browser's value, nothing
 *   adopted, promoted to the account.
 * - Signed in with neither: unticked, nothing adopted, nothing promoted — a default nobody chose
 *   is never written to an account.
 * - Signed out with a browser value: that value, nothing adopted, nothing promoted.
 * - Signed out with no browser value: unticked, nothing adopted, nothing promoted.
 */
export function decidePrintRailInstructionsHandoff(input: {
  signedIn: boolean;
  account: boolean | null;
  browser: boolean | null;
}): PrintRailInstructionsHandoff {
  const result = decidePreferenceHandoff<boolean>({ ...input, fallback: DEFAULT_PRINT_RAIL_INSTRUCTIONS });
  return {
    included: result.value,
    adoptIntoBrowser: result.adoptIntoBrowser,
    promoteToAccount: result.promoteToAccount,
  };
}
