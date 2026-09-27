/**
 * Blank makers preference boundary — the fourth instance of the account-preference pattern, after
 * Imperial/Metric (`lib/units-preference.ts`), the print toggle
 * (`lib/print-instructions-preference.ts`) and Fit & Tip Defaults
 * (`lib/fit-defaults-preference.ts`). It holds which blank makers a shaper has switched off in the
 * gear menu's BLANK MAKERS tick boxes (quick task 260926-wmf), so the ROCKER blank list only shows
 * the makers they actually buy from.
 *
 * The value is the list of HIDDEN makers (see `lib/blanks/vendors.ts` for why hidden rather than
 * shown). `null` means "not chosen" and renders as every maker on, exactly the way the other
 * preferences render their default; a default nobody chose is never written anywhere.
 *
 * Every stored value — cookie, localStorage, the account column and a Server Action's input — is
 * untrusted. The readers keep only makers the app knows by their exact name, drop repeats, and
 * never throw: anything malformed reads as "not chosen". A value that would hide every maker also
 * reads as "not chosen" (every maker on), so no stored value can ever empty the blank list — and the
 * gear menu refuses to untick the last maker in the first place.
 *
 * The whole hidden list is one value, like Units: the last pick wins across devices. The sign-in
 * handoff is the shared `decidePreferenceHandoff` with a fallback of "nothing hidden".
 *
 * No React, browser global or database import — as pure as its siblings.
 */

import { KNOWN_BLANK_VENDORS, isKnownBlankVendor, type BlankVendor } from "./blanks/vendors";
import { decidePreferenceHandoff } from "./preference-handoff";

export const BLANK_MAKERS_STORAGE_KEY = "shaper-blank-makers";
export const BLANK_MAKERS_COOKIE_NAME = "shaper-blank-makers";
/** One year, matching the units cookie precedent. */
export const BLANK_MAKERS_COOKIE_MAX_AGE_SECONDS = 31_536_000;

/** The known makers in `values`, each once, in catalogue order. */
function inCatalogueOrder(values: readonly unknown[]): BlankVendor[] {
  return KNOWN_BLANK_VENDORS.filter((vendor) => values.includes(vendor));
}

/**
 * Reads a stored hidden list back: only known makers (exact spelling), no repeats, catalogue order.
 * `null` ("not chosen", every maker on) for anything that is not a list, and for a list that would
 * hide every maker. A list of only names the app doesn't know reads as nothing hidden.
 */
export function parseHiddenBlankMakers(value: unknown): BlankVendor[] | null {
  if (!Array.isArray(value)) return null;
  const hidden = inCatalogueOrder(value.filter(isKnownBlankVendor));
  if (hidden.length === KNOWN_BLANK_VENDORS.length) return null;
  return hidden;
}

/**
 * Reads the account column (the JSON text `hiddenBlankMakersColumnValue` wrote). `null` for an
 * empty column, malformed JSON or anything that is not a list — never throws.
 */
export function parseHiddenBlankMakersColumn(text: string | null | undefined): BlankVendor[] | null {
  if (!text) return null;
  try {
    return parseHiddenBlankMakers(JSON.parse(text));
  } catch {
    return null;
  }
}

/** The JSON text written to the account column. */
export function hiddenBlankMakersColumnValue(hidden: readonly BlankVendor[]): string {
  return JSON.stringify(inCatalogueOrder(hidden));
}

/**
 * The save's strict reader, all-or-nothing: `null` — reject the whole call — when the value is not
 * a list, is longer than the list of makers, holds anything that is not exactly a maker's name,
 * names a maker twice, or would hide every maker. Otherwise the list in catalogue order.
 */
export function parseHiddenBlankMakersInput(value: unknown): BlankVendor[] | null {
  if (!Array.isArray(value)) return null;
  if (value.length > KNOWN_BLANK_VENDORS.length) return null;
  if (!value.every(isKnownBlankVendor)) return null;
  if (new Set(value).size !== value.length) return null;
  if (value.length === KNOWN_BLANK_VENDORS.length) return null;
  return inCatalogueOrder(value);
}

/**
 * The `document.cookie` assignment string: the JSON of the hidden list, percent-encoded. No
 * `Secure` (so it still works on `http://localhost:3000`); no `HttpOnly` (the browser is the
 * writer, and a list of public catalogue makers carries nothing sensitive).
 */
export function blankMakersCookieString(hidden: readonly BlankVendor[]): string {
  return `${BLANK_MAKERS_COOKIE_NAME}=${encodeURIComponent(JSON.stringify(hidden))}; Path=/; Max-Age=${BLANK_MAKERS_COOKIE_MAX_AGE_SECONDS}; SameSite=Lax`;
}

/**
 * Writes the hidden list to the browser's two stores through the sinks the caller hands in. Each
 * write is tried ON ITS OWN, like its siblings: a browser that refuses storage can still take the
 * cookie (which is what the server reads for the next page's first paint), and the reverse.
 * Returns which of the two landed. Never throws.
 */
export function writeBlankMakersToBrowser(
  hidden: readonly BlankVendor[],
  sinks: { setStorage: (raw: string) => void; setCookie: (cookie: string) => void },
): { storage: boolean; cookie: boolean } {
  let storage = true;
  let cookie = true;
  try {
    sinks.setStorage(JSON.stringify(hidden));
  } catch {
    storage = false;
  }
  try {
    sinks.setCookie(blankMakersCookieString(hidden));
  } catch {
    cookie = false;
  }
  return { storage, cookie };
}

/**
 * Reads the cookie's value part (what the server's `cookies().get(...).value` hands back):
 * percent-decode, JSON-parse, then the allow-list. `null` for a missing value, undecodable escapes
 * or anything that is not JSON — never throws.
 */
export function parseBlankMakersCookieValue(raw: string | null | undefined): BlankVendor[] | null {
  if (!raw) return null;
  try {
    return parseHiddenBlankMakers(JSON.parse(decodeURIComponent(raw)));
  } catch {
    return null;
  }
}

/**
 * Reads the blank makers cookie out of a raw `Cookie` request header (or `document.cookie`'s own
 * string shape). `null` for a missing header, an absent cookie or a junk value — never throws.
 */
export function readBlankMakersCookie(cookieHeader: string | null | undefined): BlankVendor[] | null {
  if (!cookieHeader) return null;
  for (const part of cookieHeader.split(";")) {
    const eq = part.indexOf("=");
    if (eq === -1) continue;
    const name = part.slice(0, eq).trim();
    if (name !== BLANK_MAKERS_COOKIE_NAME) continue;
    return parseBlankMakersCookieValue(part.slice(eq + 1).trim());
  }
  return null;
}

/** The result of reconciling the account's hidden makers against the browser's at sign-in/out. */
export interface BlankMakersHandoff {
  /** The makers this render/session hides — `[]` (every maker on) when nobody chose. */
  hidden: BlankVendor[];
  /** Non-null when the account's list should be written into the browser. */
  adoptIntoBrowser: BlankVendor[] | null;
  /** Non-null when an explicit browser pick should be written to an account that had none. */
  promoteToAccount: BlankVendor[] | null;
}

/**
 * The five handoff rules of `decidePreferenceHandoff`, with "nothing hidden" as the fallback:
 * signed in, the account's list wins and is adopted into the browser, or a browser-only list is
 * promoted to the account; with neither, every maker is on and nothing is written; signed out, the
 * browser's list or every maker on.
 */
export function decideBlankMakersHandoff(input: {
  signedIn: boolean;
  account: BlankVendor[] | null;
  browser: BlankVendor[] | null;
}): BlankMakersHandoff {
  const result = decidePreferenceHandoff<BlankVendor[]>({ ...input, fallback: [] });
  return {
    hidden: result.value,
    adoptIntoBrowser: result.adoptIntoBrowser,
    promoteToAccount: result.promoteToAccount,
  };
}

/** True only for the one maker still shown — the tick box that can't be unticked. */
export function isLastShownMaker(hidden: readonly BlankVendor[], vendor: BlankVendor): boolean {
  const shown = KNOWN_BLANK_VENDORS.filter((known) => !hidden.includes(known));
  return shown.length === 1 && shown[0] === vendor;
}

/**
 * The hidden list after ticking (`shown: true`) or unticking one maker, in catalogue order.
 * Unticking the last maker still shown is refused: the same makers come back, so the blank list can
 * never be emptied.
 */
export function withMakerShown(hidden: readonly BlankVendor[], vendor: BlankVendor, shown: boolean): BlankVendor[] {
  if (shown) return inCatalogueOrder(hidden.filter((known) => known !== vendor));
  if (isLastShownMaker(hidden, vendor)) return inCatalogueOrder(hidden);
  return inCatalogueOrder([...hidden, vendor]);
}
