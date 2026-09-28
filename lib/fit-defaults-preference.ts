/**
 * Fit-defaults preference boundary — the third instance of the account-preference pattern, after
 * Imperial/Metric (`lib/units-preference.ts`) and the print toggle
 * (`lib/print-instructions-preference.ts`). It holds the seven shaper defaults behind the gear
 * menu's Fit & Tip Defaults:
 *
 * - the three rules that decide which real blanks a board fits into — Extra Length and Width
 *   Margin (Phase 11 D-04, D-05), and Planer Max Depth (Phase 12 D-03), which replaced Extra Center
 *   Thickness: a blank is thick enough when its centre leaves room for the board's Deck Skin plus at
 *   least one bottom pass of this depth (D-10);
 * - what a brand-new board starts with — the Deck Skin (D-01, D-02), the nose and tail tip
 *   thicknesses, and the Tip Style, Pin deck or Bottom (D-04).
 *
 * Every stored value — cookie, localStorage, the account columns and a Server Action's input — is
 * untrusted: `parseFitDefaultValue` is an allow-list that keeps only a finite number of
 * millimetres inside that field's bounds, `parseTipStyleValue` keeps only `pinDeck` or `bottom`,
 * and each returns `null` for anything else (T-11-04, T-12-08). `null` means "not chosen" and
 * renders the default, exactly as the other two preferences do; a default nobody chose is never
 * written anywhere. The retired Extra Center Thickness key is simply ignored in a stored value (an
 * old cookie or localStorage entry) and rejects a patch outright (T-12-09).
 *
 * The sign-in handoff is decided PER FIELD through the generic `decidePreferenceHandoff`
 * (11-RESEARCH.md assumption A7), so a tip chosen on one device and a margin chosen on another
 * both survive — neither device's pick overwrites the other's. Every later save carries only the
 * fields it changed (`FitDefaultsPatch`), so that stays true after sign-in too.
 *
 * Every default and bound is authored in inches and converted through `inchesToMm`; nothing here
 * is typed in millimetres. No React, browser global or database import — as pure as its siblings.
 */

import { DEFAULT_BLANK_CUT, type FitSettings, type TipStyle } from "./geometry/blank";
import { DEFAULT_FOIL_SPEC } from "./geometry/foil";
import { inchesToMm, mm, type Mm } from "./geometry/units";
import { decidePreferenceHandoff } from "./preference-handoff";

/** The six settings that are a number of millimetres, by name. */
export type FitDefaultsMmKey =
  | "extraLength"
  | "planerMaxDepth"
  | "widthMargin"
  | "deckSkin"
  | "noseTipThickness"
  | "tailTipThickness";

/** All seven settings, by name: the six numbers and the Tip Style. */
export type FitDefaultsKey = FitDefaultsMmKey | "tipStyle";

/**
 * The six number settings in the defaults dialog's row order: the three fit rules (WHICH BLANKS
 * FIT), then what a new board starts with (NEW BOARDS START WITH).
 */
export const FIT_DEFAULTS_MM_KEYS: readonly FitDefaultsMmKey[] = [
  "extraLength",
  "planerMaxDepth",
  "widthMargin",
  "deckSkin",
  "noseTipThickness",
  "tailTipThickness",
];

/** All seven settings: the six numbers in dialog order, then the Tip Style. */
export const FIT_DEFAULTS_KEYS: readonly FitDefaultsKey[] = [...FIT_DEFAULTS_MM_KEYS, "tipStyle"];

/** What a shaper has chosen — `null` for any setting they have not touched. */
export type FitDefaultsPreference = Record<FitDefaultsMmKey, Mm | null> & { tipStyle: TipStyle | null };

/** Every setting resolved to a value — a chosen one, or its default. */
export type FitDefaults = Record<FitDefaultsMmKey, Mm> & { tipStyle: TipStyle };

/**
 * What each setting reads when nobody has chosen: a blank must be at least 2" longer than the
 * board (D-04) with 1" of width to spare (D-05), and leave room at the centre for the skin plus one
 * 1/8" planer pass (D-03, D-10); a new board starts with the out-of-the-box cut (a 1/8" Deck Skin,
 * Pin deck — `DEFAULT_BLANK_CUT`) and the foil's own nose and tail tips (`DEFAULT_FOIL_SPEC`), each
 * imported rather than restated.
 */
export const DEFAULT_FIT_DEFAULTS: FitDefaults = {
  extraLength: inchesToMm(2),
  planerMaxDepth: inchesToMm(0.125),
  widthMargin: inchesToMm(1),
  deckSkin: DEFAULT_BLANK_CUT.deckSkin,
  noseTipThickness: DEFAULT_FOIL_SPEC.noseTip,
  tailTipThickness: DEFAULT_FOIL_SPEC.tailTip,
  tipStyle: DEFAULT_BLANK_CUT.tipStyle,
};

/**
 * Each number setting's sane range, in inches: Extra Length 0"–12", Planer Max Depth 1/16"–1/4"
 * (never zero — it divides the passes), Width Margin 0"–3", Deck Skin 1/16"–1/2", each tip
 * 1/8"–1 1/2", all in 1/16" steps (11-UI-SPEC §12, 12-UI-SPEC §1 and §6). Inclusive at both ends.
 * The dialog's typed fields — and later the ROCKER sidebar's Deck Skin — take their bounds from
 * here; the parser compares in millimetres after converting these through `inchesToMm`.
 */
export const FIT_DEFAULTS_RANGE_IN = {
  extraLength: { min: 0, max: 12, step: 0.0625 },
  planerMaxDepth: { min: 0.0625, max: 0.25, step: 0.0625 },
  widthMargin: { min: 0, max: 3, step: 0.0625 },
  deckSkin: { min: 0.0625, max: 0.5, step: 0.0625 },
  noseTipThickness: { min: 0.125, max: 1.5, step: 0.0625 },
  tailTipThickness: { min: 0.125, max: 1.5, step: 0.0625 },
} as const satisfies Record<FitDefaultsMmKey, { min: number; max: number; step: number }>;

const BOUND_TOLERANCE_MM = 1e-6;

/** Nothing chosen — what every garbage or missing stored value reads as. */
export const EMPTY_FIT_DEFAULTS_PREFERENCE: FitDefaultsPreference = {
  extraLength: null,
  planerMaxDepth: null,
  widthMargin: null,
  deckSkin: null,
  noseTipThickness: null,
  tailTipThickness: null,
  tipStyle: null,
};

/**
 * Reads one stored number setting back as millimetres, or `null` for anything that is not a
 * finite number inside that setting's bounds — a string, a boolean, NaN, Infinity, a negative
 * value, a value above the maximum, a tip thinner than 1/8", or a Deck Skin or Planer Max Depth
 * under 1/16". Never a silent default: the caller decides what "not chosen" renders as.
 */
export function parseFitDefaultValue(key: FitDefaultsMmKey, value: unknown): Mm | null {
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
 * Reads a stored Tip Style back: exactly `"pinDeck"` or `"bottom"`, and `null` for anything else —
 * another string, a different case, a number, an object (T-12-08).
 */
export function parseTipStyleValue(value: unknown): TipStyle | null {
  return value === "pinDeck" || value === "bottom" ? value : null;
}

/** One stored setting through its own allow-list — the Tip Style's, or the millimetre one. */
function parseField<K extends FitDefaultsKey>(key: K, value: unknown): FitDefaultsPreference[K] {
  const parsed = key === "tipStyle" ? parseTipStyleValue(value) : parseFitDefaultValue(key as FitDefaultsMmKey, value);
  return parsed as FitDefaultsPreference[K];
}

/** Sets one field on a preference-shaped record, keeping the key and its value's type together. */
function setField<K extends FitDefaultsKey>(target: Partial<FitDefaultsPreference>, key: K, value: FitDefaultsPreference[K]): void {
  target[key] = value;
}

/**
 * Reads a whole stored preference back, field by field: each valid field is kept, each invalid
 * one becomes `null`, unknown extra keys (a legacy `extraCenterThickness` among them) are ignored,
 * and anything that is not a plain object (a string, a number, `null`, an array) reads as seven
 * nulls.
 */
export function parseFitDefaultsPreference(value: unknown): FitDefaultsPreference {
  if (typeof value !== "object" || value === null || Array.isArray(value)) {
    return { ...EMPTY_FIT_DEFAULTS_PREFERENCE };
  }
  const record = value as Record<string, unknown>;
  const result = { ...EMPTY_FIT_DEFAULTS_PREFERENCE };
  for (const key of FIT_DEFAULTS_KEYS) {
    if (Object.prototype.hasOwnProperty.call(record, key)) setField(result, key, parseField(key, record[key]));
  }
  return result;
}

/**
 * A change to some of the seven settings — only the keys present are changed; an absent key is
 * left exactly as it is wherever it is stored (the browser, or the account row). `null` for a
 * present key means "return this one to not chosen". This is what a save sends, so a pick made on
 * one device never overwrites a setting another device chose and this one never touched.
 */
export type FitDefaultsPatch = Partial<FitDefaultsPreference>;

/**
 * Reads an untrusted patch (a Server Action's input) through the same allow-lists as a whole
 * preference, but all-or-nothing: `null` — reject the whole call — when it is not a plain object,
 * when it carries any key that is not one of the seven (the retired `extraCenterThickness`
 * included), or when any present value is neither `null` nor a valid value for that setting (a
 * finite number of millimetres inside its bounds, or exactly `pinDeck` / `bottom` for the Tip
 * Style). Otherwise the patch with every present number snapped onto its range, and no key it
 * didn't carry.
 */
export function parseFitDefaultsPatch(value: unknown): FitDefaultsPatch | null {
  if (typeof value !== "object" || value === null || Array.isArray(value)) return null;
  const sent = value as Record<string, unknown>;
  const allowed = new Set<string>(FIT_DEFAULTS_KEYS);
  const patch: FitDefaultsPatch = {};
  for (const key of Object.keys(sent)) {
    if (!allowed.has(key)) return null;
    const fitKey = key as FitDefaultsKey;
    const raw = sent[fitKey];
    if (raw === null) {
      patch[fitKey] = null;
      continue;
    }
    const parsed = parseField(fitKey, raw);
    if (parsed === null) return null;
    setField(patch, fitKey, parsed);
  }
  return patch;
}

/** A preference with a patch laid over it: the patch's keys changed, every other key kept. */
export function mergeFitDefaultsPatch(current: FitDefaultsPreference, patch: FitDefaultsPatch): FitDefaultsPreference {
  const next = { ...current };
  for (const key of FIT_DEFAULTS_KEYS) {
    if (Object.prototype.hasOwnProperty.call(patch, key)) setField(next, key, patch[key] ?? null);
  }
  return next;
}

/**
 * Each setting's account column, by the `user_preferences` table's own property name in
 * `lib/db/schema.ts` (no database import here — just the names). The retired Extra Center
 * Thickness column is not among these names — it was dropped from the schema and the database by
 * migration 0008 (D-19, quick task 260927-qrn), so no save can write it.
 */
export const FIT_DEFAULTS_COLUMNS = {
  extraLength: "extraLengthMm",
  planerMaxDepth: "planerMaxDepthMm",
  widthMargin: "widthMarginMm",
  deckSkin: "deckSkinMm",
  noseTipThickness: "noseTipThicknessMm",
  tailTipThickness: "tailTipThicknessMm",
  tipStyle: "tipStyle",
} as const satisfies Record<FitDefaultsKey, string>;

/** The seven account columns, each typed as its setting's value (the Tip Style column is text). */
export type FitDefaultsColumnValues = {
  -readonly [K in FitDefaultsKey as (typeof FIT_DEFAULTS_COLUMNS)[K]]: FitDefaultsPreference[K];
};

/**
 * The account columns an upsert's UPDATE sets for a patch: ONLY the columns for keys the patch
 * carries, plus `updatedAt`. An absent key is never named, so the update can't touch it.
 */
export function fitDefaultsUpdateSet(
  patch: FitDefaultsPatch,
  now: Date,
): Partial<FitDefaultsColumnValues> & { updatedAt: Date } {
  const set: Partial<FitDefaultsColumnValues> & { updatedAt: Date } = { updatedAt: now };
  const columns = set as Record<string, unknown>;
  for (const key of FIT_DEFAULTS_KEYS) {
    if (Object.prototype.hasOwnProperty.call(patch, key)) columns[FIT_DEFAULTS_COLUMNS[key]] = patch[key] ?? null;
  }
  return set;
}

/** The seven columns a first-time INSERT writes for a patch: each present key's value, every
 * absent key `null` ("not chosen"). */
export function fitDefaultsInsertColumns(patch: FitDefaultsPatch): FitDefaultsColumnValues {
  const full = mergeFitDefaultsPatch(EMPTY_FIT_DEFAULTS_PREFERENCE, patch);
  const columns: Record<string, unknown> = {};
  for (const key of FIT_DEFAULTS_KEYS) columns[FIT_DEFAULTS_COLUMNS[key]] = full[key];
  return columns as FitDefaultsColumnValues;
}

/** Fills every setting nobody chose from `DEFAULT_FIT_DEFAULTS`. */
export function resolveFitDefaults(pref: FitDefaultsPreference): FitDefaults {
  const result: FitDefaults = { ...DEFAULT_FIT_DEFAULTS };
  for (const key of FIT_DEFAULTS_MM_KEYS) {
    const chosen = pref[key];
    if (chosen !== null) result[key] = chosen;
  }
  if (pref.tipStyle !== null) result.tipStyle = pref.tipStyle;
  return result;
}

/**
 * Just the three fit rules the blank list judges by — Extra Length, Planer Max Depth and Width
 * Margin (D-10) — without what a new board starts with. The Deck Skin half of the centre floor is
 * the board's own (its blank's skin, or the default when no blank is picked), so it travels with
 * the board rather than with these rules.
 */
export function toFitSettings(resolved: FitDefaults): FitSettings {
  return {
    extraLength: resolved.extraLength,
    planerMaxDepth: resolved.planerMaxDepth,
    widthMargin: resolved.widthMargin,
  };
}

export const FIT_DEFAULTS_STORAGE_KEY = "shaper-fit-defaults";
export const FIT_DEFAULTS_COOKIE_NAME = "shaper-fit-defaults";
/** One year, matching the units cookie precedent. */
export const FIT_DEFAULTS_COOKIE_MAX_AGE_SECONDS = 31_536_000;

/**
 * The `document.cookie` assignment string for a fit-defaults preference: the JSON of the seven
 * fields, percent-encoded. No `Secure` (so it still works on `http://localhost:3000`); no
 * `HttpOnly` (the browser is the writer, and six shaping numbers and a Tip Style carry nothing
 * sensitive).
 */
export function fitDefaultsCookieString(pref: FitDefaultsPreference): string {
  return `${FIT_DEFAULTS_COOKIE_NAME}=${encodeURIComponent(JSON.stringify(pref))}; Path=/; Max-Age=${FIT_DEFAULTS_COOKIE_MAX_AGE_SECONDS}; SameSite=Lax`;
}

/**
 * Writes a preference to the browser's two stores through the sinks the caller hands in (the
 * provider passes `localStorage.setItem` and a `document.cookie` assignment; this module never
 * touches a browser global itself). Each write is tried ON ITS OWN (IN-02): a browser that refuses
 * storage (Safari private mode, blocked-storage contexts) can still accept the cookie, and the
 * cookie is what the server reads to render the shaper's own numbers on the next page's first
 * paint — so a refused localStorage must never skip it, nor a refused cookie the storage. Returns
 * which of the two landed. Never throws.
 */
export function writeFitDefaultsToBrowser(
  pref: FitDefaultsPreference,
  sinks: { setStorage: (raw: string) => void; setCookie: (cookie: string) => void },
): { storage: boolean; cookie: boolean } {
  let storage = true;
  let cookie = true;
  try {
    sinks.setStorage(JSON.stringify(pref));
  } catch {
    storage = false;
  }
  try {
    sinks.setCookie(fitDefaultsCookieString(pref));
  } catch {
    cookie = false;
  }
  return { storage, cookie };
}

/**
 * Reads the cookie's value part (what the server's `cookies().get(...).value` hands back):
 * percent-decode, JSON-parse, then the field-by-field allow-list. Seven nulls for a missing value,
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
 * string shape). Seven nulls for a missing header, an absent cookie or a junk value — never throws.
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
  /** A patch of ONLY the fields that carry an explicit browser pick into an account that had none
   * for them — non-null when there is at least one. A field the account already held is never in
   * it, so the promotion can't overwrite it (not even with its own value, which another device
   * may have changed since this page was rendered). */
  promoteToAccount: FitDefaultsPatch | null;
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
  const promoted: FitDefaultsPatch = {};
  let anyPromoted = false;
  // One field's handoff, with the field's own value type (millimetres, or the Tip Style).
  function decideField<K extends FitDefaultsKey>(key: K): void {
    const result = decidePreferenceHandoff<FitDefaultsPreference[K]>({
      signedIn: input.signedIn,
      account: account[key],
      browser: browser[key],
      fallback: null as FitDefaultsPreference[K],
    });
    setField(preference, key, result.value);
    if (result.adoptIntoBrowser !== null) anyAdopted = true;
    if (result.promoteToAccount !== null) {
      setField(promoted, key, result.value);
      anyPromoted = true;
    }
  }
  for (const key of FIT_DEFAULTS_KEYS) decideField(key);
  return {
    preference,
    adoptIntoBrowser: anyAdopted ? { ...preference } : null,
    promoteToAccount: anyPromoted ? promoted : null,
  };
}
