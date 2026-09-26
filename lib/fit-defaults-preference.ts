/**
 * Fit-defaults preference boundary — the third instance of the account-preference pattern, after
 * Imperial/Metric (`lib/units-preference.ts`) and the print toggle
 * (`lib/print-instructions-preference.ts`). It holds the five shaper defaults of D-09: the three
 * rules that decide which real blanks a board fits into (Extra Length, Extra Center Thickness and
 * Width Margin — D-04 and D-05), and the nose and tail tip thicknesses a brand-new board starts
 * from.
 *
 * Every stored value — cookie, localStorage, the account columns and a Server Action's input — is
 * untrusted: `parseFitDefaultValue` is an allow-list that keeps only a finite number of
 * millimetres inside that field's bounds, and returns `null` for anything else (T-11-04). `null`
 * means "not chosen" and renders the default, exactly as the other two preferences do; a default
 * nobody chose is never written anywhere.
 *
 * The sign-in handoff is decided PER FIELD through the generic `decidePreferenceHandoff`
 * (11-RESEARCH.md assumption A7), so a tip chosen on one device and a margin chosen on another
 * both survive — neither device's pick overwrites the other's.
 *
 * Every default and bound is authored in inches and converted through `inchesToMm`; nothing here
 * is typed in millimetres. No React, browser global or database import — as pure as its siblings.
 */

import { DEFAULT_FOIL_SPEC } from "./geometry/foil";
import { inchesToMm, mm, type Mm } from "./geometry/units";
import { decidePreferenceHandoff } from "./preference-handoff";

/** The five settings, by name. */
export type FitDefaultsKey =
  | "extraLength"
  | "extraCenterThickness"
  | "widthMargin"
  | "noseTipThickness"
  | "tailTipThickness";

/** The five settings in the defaults dialog's row order: the three fit rules, then the two tips. */
export const FIT_DEFAULTS_KEYS: readonly FitDefaultsKey[] = [
  "extraLength",
  "extraCenterThickness",
  "widthMargin",
  "noseTipThickness",
  "tailTipThickness",
];

/** What a shaper has chosen — `null` for any setting they have not touched. */
export type FitDefaultsPreference = Record<FitDefaultsKey, Mm | null>;

/** Every setting resolved to a value — a chosen one, or its default. */
export type FitDefaults = Record<FitDefaultsKey, Mm>;

/**
 * What each setting reads when nobody has chosen: a blank must be at least 2" longer and 3/8"
 * thicker at the centre than the board (D-04), with 1" of width to spare (D-05); the tips are the
 * foil's own 5/16" nose and 1/4" tail, imported rather than restated.
 */
export const DEFAULT_FIT_DEFAULTS: FitDefaults = {
  extraLength: inchesToMm(2),
  extraCenterThickness: inchesToMm(0.375),
  widthMargin: inchesToMm(1),
  noseTipThickness: DEFAULT_FOIL_SPEC.noseTip,
  tailTipThickness: DEFAULT_FOIL_SPEC.tailTip,
};

/**
 * Each setting's sane range, in inches (11-UI-SPEC §12): Extra Length 0"–12", Extra Center
 * Thickness 0"–1", Width Margin 0"–3", each tip 1/8"–1 1/2", all in 1/16" steps. Inclusive at both
 * ends. The dialog's typed fields take their bounds from here; the parser compares in millimetres
 * after converting these through `inchesToMm`.
 */
export const FIT_DEFAULTS_RANGE_IN = {
  extraLength: { min: 0, max: 12, step: 0.0625 },
  extraCenterThickness: { min: 0, max: 1, step: 0.0625 },
  widthMargin: { min: 0, max: 3, step: 0.0625 },
  noseTipThickness: { min: 0.125, max: 1.5, step: 0.0625 },
  tailTipThickness: { min: 0.125, max: 1.5, step: 0.0625 },
} as const satisfies Record<FitDefaultsKey, { min: number; max: number; step: number }>;

const BOUND_TOLERANCE_MM = 1e-6;

/** Nothing chosen — what every garbage or missing stored value reads as. */
export const EMPTY_FIT_DEFAULTS_PREFERENCE: FitDefaultsPreference = {
  extraLength: null,
  extraCenterThickness: null,
  widthMargin: null,
  noseTipThickness: null,
  tailTipThickness: null,
};

/**
 * Reads one stored setting back as millimetres, or `null` for anything that is not a finite
 * number inside that setting's bounds — a string, a boolean, NaN, Infinity, a negative value, a
 * value above the maximum, or a tip thinner than 1/8". Never a silent default: the caller decides
 * what "not chosen" renders as.
 */
export function parseFitDefaultValue(key: FitDefaultsKey, value: unknown): Mm | null {
  if (typeof value !== "number" || !Number.isFinite(value)) return null;
  const { min, max } = FIT_DEFAULTS_RANGE_IN[key];
  // A millionth of a millimetre of slack at each end, so float noise from an inch↔mm round trip
  // on a value sitting exactly on a bound is not mistaken for an out-of-range value.
  const minMm = inchesToMm(min);
  const maxMm = inchesToMm(max);
  if (value < minMm - BOUND_TOLERANCE_MM || value > maxMm + BOUND_TOLERANCE_MM) return null;
  // Snap that slack back onto the bound, so what comes out is always strictly inside the range.
  return mm(Math.min(maxMm, Math.max(minMm, value)));
}

/**
 * Reads a whole stored preference back, field by field: each valid field is kept, each invalid
 * one becomes `null`, unknown extra keys are ignored, and anything that is not a plain object
 * (a string, a number, `null`, an array) reads as five nulls.
 */
export function parseFitDefaultsPreference(value: unknown): FitDefaultsPreference {
  if (typeof value !== "object" || value === null || Array.isArray(value)) {
    return { ...EMPTY_FIT_DEFAULTS_PREFERENCE };
  }
  const record = value as Record<string, unknown>;
  const result = { ...EMPTY_FIT_DEFAULTS_PREFERENCE };
  for (const key of FIT_DEFAULTS_KEYS) {
    result[key] = Object.prototype.hasOwnProperty.call(record, key) ? parseFitDefaultValue(key, record[key]) : null;
  }
  return result;
}

/** Fills every setting nobody chose from `DEFAULT_FIT_DEFAULTS`. */
export function resolveFitDefaults(pref: FitDefaultsPreference): FitDefaults {
  const result = { ...DEFAULT_FIT_DEFAULTS };
  for (const key of FIT_DEFAULTS_KEYS) {
    const chosen = pref[key];
    if (chosen !== null) result[key] = chosen;
  }
  return result;
}

/**
 * Just the three fit rules the blank list filters by, without the tips. Declared structurally
 * here (identical to `FitSettings` in `lib/geometry/blank.ts`) so this module does not depend on
 * the blank-fit code.
 */
export function toFitSettings(resolved: FitDefaults): { extraLength: Mm; extraCenterThickness: Mm; widthMargin: Mm } {
  return {
    extraLength: resolved.extraLength,
    extraCenterThickness: resolved.extraCenterThickness,
    widthMargin: resolved.widthMargin,
  };
}

export const FIT_DEFAULTS_STORAGE_KEY = "shaper-fit-defaults";
export const FIT_DEFAULTS_COOKIE_NAME = "shaper-fit-defaults";
/** One year, matching the units cookie precedent. */
export const FIT_DEFAULTS_COOKIE_MAX_AGE_SECONDS = 31_536_000;

/**
 * The `document.cookie` assignment string for a fit-defaults preference: the JSON of the five
 * fields, percent-encoded. No `Secure` (so it still works on `http://localhost:3000`); no
 * `HttpOnly` (the browser is the writer, and five shaping numbers carry nothing sensitive).
 */
export function fitDefaultsCookieString(pref: FitDefaultsPreference): string {
  return `${FIT_DEFAULTS_COOKIE_NAME}=${encodeURIComponent(JSON.stringify(pref))}; Path=/; Max-Age=${FIT_DEFAULTS_COOKIE_MAX_AGE_SECONDS}; SameSite=Lax`;
}

/**
 * Reads the cookie's value part (what the server's `cookies().get(...).value` hands back):
 * percent-decode, JSON-parse, then the field-by-field allow-list. Five nulls for a missing value,
 * undecodable escapes or anything that is not JSON — never throws (T-11-05).
 */
export function parseFitDefaultsCookieValue(raw: string | null | undefined): FitDefaultsPreference {
  if (!raw) return { ...EMPTY_FIT_DEFAULTS_PREFERENCE };
  try {
    return parseFitDefaultsPreference(JSON.parse(decodeURIComponent(raw)));
  } catch {
    return { ...EMPTY_FIT_DEFAULTS_PREFERENCE };
  }
}

/**
 * Reads the fit-defaults cookie out of a raw `Cookie` request header (or `document.cookie`'s own
 * string shape). Five nulls for a missing header, an absent cookie or a junk value — never throws.
 */
export function readFitDefaultsCookie(cookieHeader: string | null | undefined): FitDefaultsPreference {
  if (!cookieHeader) return { ...EMPTY_FIT_DEFAULTS_PREFERENCE };
  for (const part of cookieHeader.split(";")) {
    const eq = part.indexOf("=");
    if (eq === -1) continue;
    const name = part.slice(0, eq).trim();
    if (name !== FIT_DEFAULTS_COOKIE_NAME) continue;
    return parseFitDefaultsCookieValue(part.slice(eq + 1).trim());
  }
  return { ...EMPTY_FIT_DEFAULTS_PREFERENCE };
}

/** The result of reconciling the account's settings against the browser's at sign-in/sign-out. */
export interface FitDefaultsHandoff {
  /** What this render/session should use — per field, the winner of that field's handoff. */
  preference: FitDefaultsPreference;
  /** The merged preference, to be written into the browser — non-null when any field took the
   * account's value. */
  adoptIntoBrowser: FitDefaultsPreference | null;
  /** The merged preference, to be written to the account — non-null when any field carried an
   * explicit browser pick into an account that had none for it. A field the account already held
   * is never overwritten, because the merged preference carries the account's own value for it. */
  promoteToAccount: FitDefaultsPreference | null;
}

/**
 * The handoff rule of `decidePreferenceHandoff`, applied once per field with `fallback: null`:
 * signed in, the account wins each field it holds, and each field only the browser holds is
 * promoted; signed out, the account is ignored; a field neither side chose stays `null` and is
 * never written anywhere.
 */
export function decideFitDefaultsHandoff(input: {
  signedIn: boolean;
  account: FitDefaultsPreference | null;
  browser: FitDefaultsPreference | null;
}): FitDefaultsHandoff {
  const account = input.account ?? EMPTY_FIT_DEFAULTS_PREFERENCE;
  const browser = input.browser ?? EMPTY_FIT_DEFAULTS_PREFERENCE;
  const preference = { ...EMPTY_FIT_DEFAULTS_PREFERENCE };
  let anyAdopted = false;
  let anyPromoted = false;
  for (const key of FIT_DEFAULTS_KEYS) {
    const result = decidePreferenceHandoff<Mm | null>({
      signedIn: input.signedIn,
      account: account[key],
      browser: browser[key],
      fallback: null,
    });
    preference[key] = result.value;
    if (result.adoptIntoBrowser !== null) anyAdopted = true;
    if (result.promoteToAccount !== null) anyPromoted = true;
  }
  return {
    preference,
    adoptIntoBrowser: anyAdopted ? { ...preference } : null,
    promoteToAccount: anyPromoted ? { ...preference } : null,
  };
}
