import { describe, expect, it } from "vitest";
import { DEFAULT_FOIL_SPEC } from "./geometry/foil";
import { inchesToMm, mm } from "./geometry/units";
import {
  DEFAULT_FIT_DEFAULTS,
  EMPTY_FIT_DEFAULTS_PREFERENCE,
  FIT_DEFAULTS_COOKIE_MAX_AGE_SECONDS,
  FIT_DEFAULTS_COOKIE_NAME,
  FIT_DEFAULTS_KEYS,
  FIT_DEFAULTS_RANGE_IN,
  FIT_DEFAULTS_STORAGE_KEY,
  decideFitDefaultsHandoff,
  fitDefaultsCookieString,
  parseFitDefaultValue,
  parseFitDefaultsCookieValue,
  parseFitDefaultsPreference,
  readFitDefaultsCookie,
  resolveFitDefaults,
  toFitSettings,
  type FitDefaultsPreference,
} from "./fit-defaults-preference";

const FIVE_NULLS: FitDefaultsPreference = {
  extraLength: null,
  extraCenterThickness: null,
  widthMargin: null,
  noseTipThickness: null,
  tailTipThickness: null,
};

describe("fit-defaults preference boundary", () => {
  it("exposes the storage key and cookie name as shaper-fit-defaults, kept for a year", () => {
    expect(FIT_DEFAULTS_STORAGE_KEY).toBe("shaper-fit-defaults");
    expect(FIT_DEFAULTS_COOKIE_NAME).toBe("shaper-fit-defaults");
    expect(FIT_DEFAULTS_COOKIE_MAX_AGE_SECONDS).toBe(31_536_000);
  });

  it("lists the five settings in the dialog's row order", () => {
    expect(FIT_DEFAULTS_KEYS).toEqual([
      "extraLength",
      "extraCenterThickness",
      "widthMargin",
      "noseTipThickness",
      "tailTipThickness",
    ]);
  });

  it("starts with nothing chosen", () => {
    expect(EMPTY_FIT_DEFAULTS_PREFERENCE).toEqual(FIVE_NULLS);
  });

  it("defaults to 2\", 3/8\", 1\" and the foil's own 5/16\" / 1/4\" tips (D-04, D-05, D-09)", () => {
    expect(DEFAULT_FIT_DEFAULTS).toEqual({
      extraLength: inchesToMm(2),
      extraCenterThickness: inchesToMm(0.375),
      widthMargin: inchesToMm(1),
      noseTipThickness: DEFAULT_FOIL_SPEC.noseTip,
      tailTipThickness: DEFAULT_FOIL_SPEC.tailTip,
    });
  });

  it("every default sits inside its own bounds", () => {
    for (const key of FIT_DEFAULTS_KEYS) {
      expect(parseFitDefaultValue(key, DEFAULT_FIT_DEFAULTS[key])).toBe(DEFAULT_FIT_DEFAULTS[key]);
    }
  });

  describe("parseFitDefaultValue", () => {
    it("keeps a finite millimetre value inside the field's bounds, bounds inclusive", () => {
      for (const key of FIT_DEFAULTS_KEYS) {
        const { min, max } = FIT_DEFAULTS_RANGE_IN[key];
        expect(parseFitDefaultValue(key, inchesToMm(min))).toBe(inchesToMm(min));
        expect(parseFitDefaultValue(key, inchesToMm(max))).toBe(inchesToMm(max));
        const middle = inchesToMm((min + max) / 2);
        expect(parseFitDefaultValue(key, middle)).toBe(middle);
      }
    });

    it("returns null for anything that is not a finite number", () => {
      for (const junk of [Number.NaN, Infinity, -Infinity, "50", "", true, false, {}, [], null, undefined]) {
        for (const key of FIT_DEFAULTS_KEYS) {
          expect(parseFitDefaultValue(key, junk)).toBeNull();
        }
      }
    });

    it("returns null for negative values and values above the maximum", () => {
      for (const key of FIT_DEFAULTS_KEYS) {
        expect(parseFitDefaultValue(key, mm(-1))).toBeNull();
        expect(parseFitDefaultValue(key, inchesToMm(FIT_DEFAULTS_RANGE_IN[key].max + 1 / 16))).toBeNull();
      }
    });

    it("forgives float noise on a bound, snapping it back inside the range", () => {
      const noisyMax = inchesToMm(12) + 1e-9;
      expect(parseFitDefaultValue("extraLength", noisyMax)).toBe(inchesToMm(12));
      expect(parseFitDefaultValue("widthMargin", -1e-9)).toBe(0);
    });

    it("returns null for a tip thinner than 1/8\"", () => {
      expect(parseFitDefaultValue("noseTipThickness", inchesToMm(1 / 16))).toBeNull();
      expect(parseFitDefaultValue("tailTipThickness", inchesToMm(1 / 16))).toBeNull();
      expect(parseFitDefaultValue("noseTipThickness", mm(0))).toBeNull();
    });

    it("allows zero extra length, zero extra centre thickness and zero width margin", () => {
      expect(parseFitDefaultValue("extraLength", mm(0))).toBe(0);
      expect(parseFitDefaultValue("extraCenterThickness", mm(0))).toBe(0);
      expect(parseFitDefaultValue("widthMargin", mm(0))).toBe(0);
    });
  });

  describe("parseFitDefaultsPreference", () => {
    it("keeps the valid fields, nulls the invalid ones and ignores unknown keys", () => {
      expect(
        parseFitDefaultsPreference({
          extraLength: inchesToMm(3),
          extraCenterThickness: "junk",
          widthMargin: inchesToMm(99),
          noseTipThickness: inchesToMm(0.375),
          tailTipThickness: Number.NaN,
          somethingElse: 42,
        }),
      ).toEqual({
        ...FIVE_NULLS,
        extraLength: inchesToMm(3),
        noseTipThickness: inchesToMm(0.375),
      });
    });

    it("returns five nulls for anything that is not a plain object", () => {
      for (const junk of ["shaper", 12, null, undefined, [], [inchesToMm(2)], true]) {
        expect(parseFitDefaultsPreference(junk)).toEqual(FIVE_NULLS);
      }
    });

    it("returns five nulls for an empty object", () => {
      expect(parseFitDefaultsPreference({})).toEqual(FIVE_NULLS);
    });
  });

  describe("resolveFitDefaults and toFitSettings", () => {
    it("fills every field nobody chose from the defaults", () => {
      expect(resolveFitDefaults(FIVE_NULLS)).toEqual(DEFAULT_FIT_DEFAULTS);
    });

    it("keeps every field a shaper chose", () => {
      const chosen = { ...FIVE_NULLS, widthMargin: inchesToMm(2), tailTipThickness: inchesToMm(0.5) };
      expect(resolveFitDefaults(chosen)).toEqual({
        ...DEFAULT_FIT_DEFAULTS,
        widthMargin: inchesToMm(2),
        tailTipThickness: inchesToMm(0.5),
      });
    });

    it("toFitSettings hands on exactly the three fit rules, not the tips", () => {
      const resolved = resolveFitDefaults({ ...FIVE_NULLS, extraLength: inchesToMm(4) });
      expect(toFitSettings(resolved)).toEqual({
        extraLength: inchesToMm(4),
        extraCenterThickness: DEFAULT_FIT_DEFAULTS.extraCenterThickness,
        widthMargin: DEFAULT_FIT_DEFAULTS.widthMargin,
      });
      expect(Object.keys(toFitSettings(resolved)).sort()).toEqual(
        ["extraCenterThickness", "extraLength", "widthMargin"],
      );
    });
  });

  describe("cookie", () => {
    const pref: FitDefaultsPreference = { ...FIVE_NULLS, extraLength: inchesToMm(3), noseTipThickness: inchesToMm(0.375) };

    it("fitDefaultsCookieString carries the encoded JSON, Path, Max-Age and SameSite — no Secure, no HttpOnly", () => {
      expect(fitDefaultsCookieString(pref)).toBe(
        `shaper-fit-defaults=${encodeURIComponent(JSON.stringify(pref))}; Path=/; Max-Age=31536000; SameSite=Lax`,
      );
      expect(fitDefaultsCookieString(pref)).not.toContain("Secure");
      expect(fitDefaultsCookieString(pref)).not.toContain("HttpOnly");
    });

    it("parseFitDefaultsCookieValue reads the value part back", () => {
      expect(parseFitDefaultsCookieValue(encodeURIComponent(JSON.stringify(pref)))).toEqual(pref);
    });

    it("parseFitDefaultsCookieValue returns five nulls for a missing, undecodable or non-JSON value", () => {
      for (const junk of [null, undefined, "", "%E0%A4%A", "not-json", encodeURIComponent("{oops"), "12"]) {
        expect(parseFitDefaultsCookieValue(junk)).toEqual(FIVE_NULLS);
      }
    });

    it("readFitDefaultsCookie round-trips the whole cookie string among others", () => {
      const cookieValue = fitDefaultsCookieString(pref).split(";")[0];
      expect(readFitDefaultsCookie(`shaper-units=metric; ${cookieValue}; other=1`)).toEqual(pref);
    });

    it("readFitDefaultsCookie returns five nulls for a missing header or a missing cookie", () => {
      expect(readFitDefaultsCookie(null)).toEqual(FIVE_NULLS);
      expect(readFitDefaultsCookie(undefined)).toEqual(FIVE_NULLS);
      expect(readFitDefaultsCookie("")).toEqual(FIVE_NULLS);
      expect(readFitDefaultsCookie("shaper-units=metric; other=1")).toEqual(FIVE_NULLS);
    });

    it("readFitDefaultsCookie never throws on a garbage cookie", () => {
      for (const junk of ["shaper-fit-defaults=%E0%A4%A", "shaper-fit-defaults=not-json", "shaper-fit-defaults="]) {
        expect(() => readFitDefaultsCookie(junk)).not.toThrow();
        expect(readFitDefaultsCookie(junk)).toEqual(FIVE_NULLS);
      }
    });

    it("a hand-edited cookie with an out-of-range value keeps only what is sane", () => {
      const tampered = { ...FIVE_NULLS, extraLength: inchesToMm(500), widthMargin: inchesToMm(1.5) };
      expect(readFitDefaultsCookie(`shaper-fit-defaults=${encodeURIComponent(JSON.stringify(tampered))}`)).toEqual({
        ...FIVE_NULLS,
        widthMargin: inchesToMm(1.5),
      });
    });
  });

  describe("decideFitDefaultsHandoff (per field, A7)", () => {
    it("signed in: an account length and a browser margin both survive; the length is adopted, the margin promoted", () => {
      const result = decideFitDefaultsHandoff({
        signedIn: true,
        account: { ...FIVE_NULLS, extraLength: inchesToMm(3) },
        browser: { ...FIVE_NULLS, widthMargin: inchesToMm(2) },
      });
      const merged = { ...FIVE_NULLS, extraLength: inchesToMm(3), widthMargin: inchesToMm(2) };
      expect(result.preference).toEqual(merged);
      expect(result.adoptIntoBrowser).toEqual(merged);
      expect(result.promoteToAccount).toEqual(merged);
      expect(result.promoteToAccount?.widthMargin).toBe(inchesToMm(2));
    });

    it("signed in: the account wins a field both sides chose, and nothing is promoted for it", () => {
      const result = decideFitDefaultsHandoff({
        signedIn: true,
        account: { ...FIVE_NULLS, noseTipThickness: inchesToMm(0.5) },
        browser: { ...FIVE_NULLS, noseTipThickness: inchesToMm(0.25) },
      });
      expect(result.preference).toEqual({ ...FIVE_NULLS, noseTipThickness: inchesToMm(0.5) });
      expect(result.adoptIntoBrowser).toEqual({ ...FIVE_NULLS, noseTipThickness: inchesToMm(0.5) });
      expect(result.promoteToAccount).toBeNull();
    });

    it("signed out: the account is ignored entirely", () => {
      const result = decideFitDefaultsHandoff({
        signedIn: false,
        account: { ...FIVE_NULLS, extraLength: inchesToMm(3) },
        browser: { ...FIVE_NULLS, widthMargin: inchesToMm(2) },
      });
      expect(result).toEqual({
        preference: { ...FIVE_NULLS, widthMargin: inchesToMm(2) },
        adoptIntoBrowser: null,
        promoteToAccount: null,
      });
    });

    it("signed in with neither: five nulls, nothing adopted or promoted — a default nobody chose is never written", () => {
      expect(decideFitDefaultsHandoff({ signedIn: true, account: FIVE_NULLS, browser: FIVE_NULLS })).toEqual({
        preference: FIVE_NULLS,
        adoptIntoBrowser: null,
        promoteToAccount: null,
      });
    });
  });
});
