import { describe, expect, it } from "vitest";
import { DEFAULT_BLANK_CUT } from "./geometry/blank";
import { DEFAULT_FOIL_SPEC } from "./geometry/foil";
import { inchesToMm, mm } from "./geometry/units";
import {
  DEFAULT_FIT_DEFAULTS,
  EMPTY_FIT_DEFAULTS_PREFERENCE,
  FIT_DEFAULTS_COOKIE_MAX_AGE_SECONDS,
  FIT_DEFAULTS_COOKIE_NAME,
  FIT_DEFAULTS_KEYS,
  FIT_DEFAULTS_MM_KEYS,
  FIT_DEFAULTS_RANGE_IN,
  FIT_DEFAULTS_STORAGE_KEY,
  FIT_DEFAULTS_COLUMNS,
  decideFitDefaultsHandoff,
  fitDefaultsCookieString,
  fitDefaultsInsertColumns,
  fitDefaultsUpdateSet,
  mergeFitDefaultsPatch,
  parseFitDefaultsPatch,
  writeFitDefaultsToBrowser,
  parseFitDefaultValue,
  parseFitDefaultsCookieValue,
  parseFitDefaultsPreference,
  parseTipStyleValue,
  readFitDefaultsCookie,
  resolveFitDefaults,
  toFitSettings,
  type FitDefaultsPreference,
} from "./fit-defaults-preference";

const SEVEN_NULLS: FitDefaultsPreference = {
  extraLength: null,
  planerMaxDepth: null,
  widthMargin: null,
  deckSkin: null,
  noseTipThickness: null,
  tailTipThickness: null,
  tipStyle: null,
};

describe("fit-defaults preference boundary", () => {
  it("exposes the storage key and cookie name as shaper-fit-defaults, kept for a year", () => {
    expect(FIT_DEFAULTS_STORAGE_KEY).toBe("shaper-fit-defaults");
    expect(FIT_DEFAULTS_COOKIE_NAME).toBe("shaper-fit-defaults");
    expect(FIT_DEFAULTS_COOKIE_MAX_AGE_SECONDS).toBe(31_536_000);
  });

  it("lists the six number settings in the dialog's row order, then the Tip Style", () => {
    expect(FIT_DEFAULTS_MM_KEYS).toEqual([
      "extraLength",
      "planerMaxDepth",
      "widthMargin",
      "deckSkin",
      "noseTipThickness",
      "tailTipThickness",
    ]);
    expect(FIT_DEFAULTS_KEYS).toEqual([...FIT_DEFAULTS_MM_KEYS, "tipStyle"]);
  });

  it("no longer knows Extra Center Thickness anywhere (D-10, D-19)", () => {
    expect(FIT_DEFAULTS_KEYS).not.toContain("extraCenterThickness");
    expect(Object.keys(DEFAULT_FIT_DEFAULTS)).not.toContain("extraCenterThickness");
    expect(Object.keys(FIT_DEFAULTS_RANGE_IN)).not.toContain("extraCenterThickness");
    expect(Object.values(FIT_DEFAULTS_COLUMNS)).not.toContain("extraCenterThicknessMm");
  });

  it("starts with nothing chosen", () => {
    expect(EMPTY_FIT_DEFAULTS_PREFERENCE).toEqual(SEVEN_NULLS);
  });

  it("defaults to 2\", a 1/8\" planer pass, 1\", the out-of-the-box cut and the foil's own tips (D-02, D-03, D-04)", () => {
    expect(DEFAULT_FIT_DEFAULTS).toEqual({
      extraLength: inchesToMm(2),
      planerMaxDepth: inchesToMm(1 / 8),
      widthMargin: inchesToMm(1),
      deckSkin: DEFAULT_BLANK_CUT.deckSkin,
      noseTipThickness: DEFAULT_FOIL_SPEC.noseTip,
      tailTipThickness: DEFAULT_FOIL_SPEC.tailTip,
      tipStyle: DEFAULT_BLANK_CUT.tipStyle,
    });
    expect(DEFAULT_FIT_DEFAULTS.tipStyle).toBe("pinDeck");
  });

  it("bounds Planer Max Depth to 1/16\"–1/4\" and Deck Skin to 1/16\"–1/2\", in 1/16\" steps", () => {
    expect(FIT_DEFAULTS_RANGE_IN.planerMaxDepth).toEqual({ min: 1 / 16, max: 1 / 4, step: 1 / 16 });
    expect(FIT_DEFAULTS_RANGE_IN.deckSkin).toEqual({ min: 1 / 16, max: 1 / 2, step: 1 / 16 });
  });

  it("every number default sits inside its own bounds", () => {
    for (const key of FIT_DEFAULTS_MM_KEYS) {
      expect(parseFitDefaultValue(key, DEFAULT_FIT_DEFAULTS[key])).toBe(DEFAULT_FIT_DEFAULTS[key]);
    }
  });

  describe("parseFitDefaultValue", () => {
    it("keeps a finite millimetre value inside the field's bounds, bounds inclusive", () => {
      for (const key of FIT_DEFAULTS_MM_KEYS) {
        const { min, max } = FIT_DEFAULTS_RANGE_IN[key];
        expect(parseFitDefaultValue(key, inchesToMm(min))).toBe(inchesToMm(min));
        expect(parseFitDefaultValue(key, inchesToMm(max))).toBe(inchesToMm(max));
        const middle = inchesToMm((min + max) / 2);
        expect(parseFitDefaultValue(key, middle)).toBe(middle);
      }
    });

    it("returns null for anything that is not a finite number", () => {
      for (const junk of [Number.NaN, Infinity, -Infinity, "50", "", true, false, {}, [], null, undefined]) {
        for (const key of FIT_DEFAULTS_MM_KEYS) {
          expect(parseFitDefaultValue(key, junk)).toBeNull();
        }
      }
    });

    it("returns null for negative values and values above the maximum", () => {
      for (const key of FIT_DEFAULTS_MM_KEYS) {
        expect(parseFitDefaultValue(key, mm(-1))).toBeNull();
        expect(parseFitDefaultValue(key, inchesToMm(FIT_DEFAULTS_RANGE_IN[key].max + 1 / 16))).toBeNull();
      }
    });

    it("forgives float noise on a bound, snapping it back inside the range", () => {
      const noisyMax = inchesToMm(12) + 1e-9;
      expect(parseFitDefaultValue("extraLength", noisyMax)).toBe(inchesToMm(12));
      expect(parseFitDefaultValue("widthMargin", -1e-9)).toBe(0);
      expect(parseFitDefaultValue("deckSkin", inchesToMm(1 / 2) + 1e-9)).toBe(inchesToMm(1 / 2));
    });

    it("returns null for a tip thinner than 1/8\"", () => {
      expect(parseFitDefaultValue("noseTipThickness", inchesToMm(1 / 16))).toBeNull();
      expect(parseFitDefaultValue("tailTipThickness", inchesToMm(1 / 16))).toBeNull();
      expect(parseFitDefaultValue("noseTipThickness", mm(0))).toBeNull();
    });

    it("returns null for a Planer Max Depth or Deck Skin of zero, or under 1/16\" — a pass can't be nothing", () => {
      for (const key of ["planerMaxDepth", "deckSkin"] as const) {
        expect(parseFitDefaultValue(key, mm(0))).toBeNull();
        expect(parseFitDefaultValue(key, inchesToMm(1 / 32))).toBeNull();
      }
      expect(parseFitDefaultValue("planerMaxDepth", inchesToMm(5 / 16))).toBeNull();
      expect(parseFitDefaultValue("deckSkin", inchesToMm(9 / 16))).toBeNull();
    });

    it("allows zero extra length and zero width margin", () => {
      expect(parseFitDefaultValue("extraLength", mm(0))).toBe(0);
      expect(parseFitDefaultValue("widthMargin", mm(0))).toBe(0);
    });
  });

  describe("parseTipStyleValue", () => {
    it("accepts exactly Pin deck and Bottom", () => {
      expect(parseTipStyleValue("pinDeck")).toBe("pinDeck");
      expect(parseTipStyleValue("bottom")).toBe("bottom");
    });

    it("returns null for anything else", () => {
      for (const junk of ["PinDeck", "pin deck", "Bottom", "deck", "sideways", "", 0, 1, true, null, undefined, {}, ["bottom"]]) {
        expect(parseTipStyleValue(junk), JSON.stringify(junk)).toBeNull();
      }
    });
  });

  describe("parseFitDefaultsPreference", () => {
    it("keeps the valid fields, nulls the invalid ones and ignores unknown keys", () => {
      expect(
        parseFitDefaultsPreference({
          extraLength: inchesToMm(3),
          planerMaxDepth: "junk",
          widthMargin: inchesToMm(99),
          deckSkin: inchesToMm(1 / 4),
          noseTipThickness: inchesToMm(0.375),
          tailTipThickness: Number.NaN,
          tipStyle: "bottom",
          somethingElse: 42,
        }),
      ).toEqual({
        ...SEVEN_NULLS,
        extraLength: inchesToMm(3),
        deckSkin: inchesToMm(1 / 4),
        noseTipThickness: inchesToMm(0.375),
        tipStyle: "bottom",
      });
    });

    it("a stored value still holding the retired Extra Center Thickness reads it as nothing at all", () => {
      expect(parseFitDefaultsPreference({ extraCenterThickness: inchesToMm(3 / 8) })).toEqual(SEVEN_NULLS);
      expect(
        parseFitDefaultsPreference({ extraCenterThickness: inchesToMm(3 / 8), widthMargin: inchesToMm(2) }),
      ).toEqual({ ...SEVEN_NULLS, widthMargin: inchesToMm(2) });
    });

    it("a Tip Style that is not Pin deck or Bottom reads as not chosen", () => {
      expect(parseFitDefaultsPreference({ tipStyle: "sideways" })).toEqual(SEVEN_NULLS);
      expect(parseFitDefaultsPreference({ tipStyle: 1 })).toEqual(SEVEN_NULLS);
    });

    it("returns seven nulls for anything that is not a plain object", () => {
      for (const junk of ["shaper", 12, null, undefined, [], [inchesToMm(2)], true]) {
        expect(parseFitDefaultsPreference(junk)).toEqual(SEVEN_NULLS);
      }
    });

    it("returns seven nulls for an empty object", () => {
      expect(parseFitDefaultsPreference({})).toEqual(SEVEN_NULLS);
    });
  });

  describe("resolveFitDefaults and toFitSettings", () => {
    it("fills every field nobody chose from the defaults", () => {
      expect(resolveFitDefaults(SEVEN_NULLS)).toEqual(DEFAULT_FIT_DEFAULTS);
    });

    it("keeps every field a shaper chose, the Tip Style included", () => {
      const chosen = {
        ...SEVEN_NULLS,
        widthMargin: inchesToMm(2),
        deckSkin: inchesToMm(3 / 16),
        tailTipThickness: inchesToMm(0.5),
        tipStyle: "bottom" as const,
      };
      expect(resolveFitDefaults(chosen)).toEqual({
        ...DEFAULT_FIT_DEFAULTS,
        widthMargin: inchesToMm(2),
        deckSkin: inchesToMm(3 / 16),
        tailTipThickness: inchesToMm(0.5),
        tipStyle: "bottom",
      });
    });

    it("toFitSettings hands on exactly the three fit rules — Extra Length, Planer Max Depth, Width Margin", () => {
      const resolved = resolveFitDefaults({ ...SEVEN_NULLS, extraLength: inchesToMm(4), planerMaxDepth: inchesToMm(3 / 16) });
      expect(toFitSettings(resolved)).toEqual({
        extraLength: inchesToMm(4),
        planerMaxDepth: inchesToMm(3 / 16),
        widthMargin: DEFAULT_FIT_DEFAULTS.widthMargin,
      });
      expect(Object.keys(toFitSettings(resolved)).sort()).toEqual(["extraLength", "planerMaxDepth", "widthMargin"]);
    });
  });

  describe("cookie", () => {
    const pref: FitDefaultsPreference = {
      ...SEVEN_NULLS,
      extraLength: inchesToMm(3),
      noseTipThickness: inchesToMm(0.375),
      tipStyle: "bottom",
    };

    it("fitDefaultsCookieString carries the encoded JSON, Path, Max-Age and SameSite — no Secure, no HttpOnly", () => {
      expect(fitDefaultsCookieString(pref)).toBe(
        `shaper-fit-defaults=${encodeURIComponent(JSON.stringify(pref))}; Path=/; Max-Age=31536000; SameSite=Lax`,
      );
      expect(fitDefaultsCookieString(pref)).not.toContain("Secure");
      expect(fitDefaultsCookieString(pref)).not.toContain("HttpOnly");
    });

    it("parseFitDefaultsCookieValue reads the value part back, Tip Style included", () => {
      expect(parseFitDefaultsCookieValue(encodeURIComponent(JSON.stringify(pref)))).toEqual(pref);
    });

    it("parseFitDefaultsCookieValue returns seven nulls for a missing, undecodable or non-JSON value", () => {
      for (const junk of [null, undefined, "", "%E0%A4%A", "not-json", encodeURIComponent("{oops"), "12"]) {
        expect(parseFitDefaultsCookieValue(junk)).toEqual(SEVEN_NULLS);
      }
    });

    it("an old cookie from before Planer Max Depth keeps every setting but the retired one", () => {
      const old = {
        extraLength: inchesToMm(3),
        extraCenterThickness: inchesToMm(1 / 2),
        widthMargin: null,
        noseTipThickness: inchesToMm(0.375),
        tailTipThickness: null,
      };
      expect(readFitDefaultsCookie(`shaper-fit-defaults=${encodeURIComponent(JSON.stringify(old))}`)).toEqual({
        ...SEVEN_NULLS,
        extraLength: inchesToMm(3),
        noseTipThickness: inchesToMm(0.375),
      });
    });

    it("readFitDefaultsCookie round-trips the whole cookie string among others", () => {
      const cookieValue = fitDefaultsCookieString(pref).split(";")[0];
      expect(readFitDefaultsCookie(`shaper-units=metric; ${cookieValue}; other=1`)).toEqual(pref);
    });

    it("readFitDefaultsCookie returns seven nulls for a missing header or a missing cookie", () => {
      expect(readFitDefaultsCookie(null)).toEqual(SEVEN_NULLS);
      expect(readFitDefaultsCookie(undefined)).toEqual(SEVEN_NULLS);
      expect(readFitDefaultsCookie("")).toEqual(SEVEN_NULLS);
      expect(readFitDefaultsCookie("shaper-units=metric; other=1")).toEqual(SEVEN_NULLS);
    });

    it("readFitDefaultsCookie never throws on a garbage cookie", () => {
      for (const junk of ["shaper-fit-defaults=%E0%A4%A", "shaper-fit-defaults=not-json", "shaper-fit-defaults="]) {
        expect(() => readFitDefaultsCookie(junk)).not.toThrow();
        expect(readFitDefaultsCookie(junk)).toEqual(SEVEN_NULLS);
      }
    });

    it("a hand-edited cookie with an out-of-range value keeps only what is sane", () => {
      const tampered = { ...SEVEN_NULLS, extraLength: inchesToMm(500), widthMargin: inchesToMm(1.5), tipStyle: "Pin" };
      expect(readFitDefaultsCookie(`shaper-fit-defaults=${encodeURIComponent(JSON.stringify(tampered))}`)).toEqual({
        ...SEVEN_NULLS,
        widthMargin: inchesToMm(1.5),
      });
    });
  });

  describe("decideFitDefaultsHandoff (per field, A7)", () => {
    it("signed in: an account length and a browser margin both survive; the length is adopted, the margin promoted", () => {
      const result = decideFitDefaultsHandoff({
        signedIn: true,
        account: { ...SEVEN_NULLS, extraLength: inchesToMm(3) },
        browser: { ...SEVEN_NULLS, widthMargin: inchesToMm(2) },
      });
      const merged = { ...SEVEN_NULLS, extraLength: inchesToMm(3), widthMargin: inchesToMm(2) };
      expect(result.preference).toEqual(merged);
      expect(result.adoptIntoBrowser).toEqual(merged);
      // Only the field the account lacked is promoted — never the account's own length (WR-02).
      expect(result.promoteToAccount).toEqual({ widthMargin: inchesToMm(2) });
    });

    it("signed in: the Tip Style is decided on its own — an account Tip Style is adopted, a browser Deck Skin promoted", () => {
      const result = decideFitDefaultsHandoff({
        signedIn: true,
        account: { ...SEVEN_NULLS, tipStyle: "bottom" },
        browser: { ...SEVEN_NULLS, tipStyle: "pinDeck", deckSkin: inchesToMm(1 / 4) },
      });
      const merged = { ...SEVEN_NULLS, tipStyle: "bottom" as const, deckSkin: inchesToMm(1 / 4) };
      expect(result.preference).toEqual(merged);
      expect(result.adoptIntoBrowser).toEqual(merged);
      expect(result.promoteToAccount).toEqual({ deckSkin: inchesToMm(1 / 4) });
    });

    it("signed in: a browser Tip Style is promoted into an account that has none", () => {
      const result = decideFitDefaultsHandoff({
        signedIn: true,
        account: SEVEN_NULLS,
        browser: { ...SEVEN_NULLS, tipStyle: "bottom" },
      });
      expect(result.preference).toEqual({ ...SEVEN_NULLS, tipStyle: "bottom" });
      expect(result.adoptIntoBrowser).toBeNull();
      expect(result.promoteToAccount).toEqual({ tipStyle: "bottom" });
    });

    it("signed in: the account wins a field both sides chose, and nothing is promoted for it", () => {
      const result = decideFitDefaultsHandoff({
        signedIn: true,
        account: { ...SEVEN_NULLS, noseTipThickness: inchesToMm(0.5) },
        browser: { ...SEVEN_NULLS, noseTipThickness: inchesToMm(0.25) },
      });
      expect(result.preference).toEqual({ ...SEVEN_NULLS, noseTipThickness: inchesToMm(0.5) });
      expect(result.adoptIntoBrowser).toEqual({ ...SEVEN_NULLS, noseTipThickness: inchesToMm(0.5) });
      expect(result.promoteToAccount).toBeNull();
    });

    it("signed out: the account is ignored entirely", () => {
      const result = decideFitDefaultsHandoff({
        signedIn: false,
        account: { ...SEVEN_NULLS, extraLength: inchesToMm(3), tipStyle: "bottom" },
        browser: { ...SEVEN_NULLS, widthMargin: inchesToMm(2) },
      });
      expect(result).toEqual({
        preference: { ...SEVEN_NULLS, widthMargin: inchesToMm(2) },
        adoptIntoBrowser: null,
        promoteToAccount: null,
      });
    });

    it("signed in with neither: seven nulls, nothing adopted or promoted — a default nobody chose is never written", () => {
      expect(decideFitDefaultsHandoff({ signedIn: true, account: SEVEN_NULLS, browser: SEVEN_NULLS })).toEqual({
        preference: SEVEN_NULLS,
        adoptIntoBrowser: null,
        promoteToAccount: null,
      });
    });
  });

  describe("saving a change, not the whole preference (WR-02)", () => {
    it("parseFitDefaultsPatch keeps exactly the keys sent, each through its allow-list", () => {
      expect(parseFitDefaultsPatch({ widthMargin: inchesToMm(2) })).toEqual({ widthMargin: inchesToMm(2) });
      expect(parseFitDefaultsPatch({ noseTipThickness: null })).toEqual({ noseTipThickness: null });
      expect(parseFitDefaultsPatch({ planerMaxDepth: inchesToMm(3 / 16) })).toEqual({ planerMaxDepth: inchesToMm(3 / 16) });
      expect(parseFitDefaultsPatch({ deckSkin: inchesToMm(1 / 4) })).toEqual({ deckSkin: inchesToMm(1 / 4) });
      expect(parseFitDefaultsPatch({ tipStyle: "bottom" })).toEqual({ tipStyle: "bottom" });
      expect(parseFitDefaultsPatch({ tipStyle: null })).toEqual({ tipStyle: null });
      expect(parseFitDefaultsPatch({ ...SEVEN_NULLS })).toEqual(SEVEN_NULLS);
      expect(parseFitDefaultsPatch({})).toEqual({});
    });

    it("parseFitDefaultsPatch rejects the whole call for an unknown key, the retired key, or any bad value", () => {
      for (const bad of [
        null,
        "x",
        [inchesToMm(1)],
        { widthMargin: inchesToMm(1), units: "metric" },
        { clerkUserId: "someone-else" },
        { extraCenterThickness: inchesToMm(3 / 8) },
        { extraCenterThickness: null },
        { widthMargin: inchesToMm(1), extraCenterThickness: inchesToMm(3 / 8) },
        { widthMargin: inchesToMm(1), extraLength: inchesToMm(500) },
        { noseTipThickness: Number.NaN },
        { tailTipThickness: "0.25" },
        { extraLength: undefined },
        { tipStyle: "sideways" },
        { widthMargin: inchesToMm(1), tipStyle: "Bottom" },
        { tipStyle: 1 },
        { planerMaxDepth: mm(0) },
        { deckSkin: inchesToMm(1) },
      ]) {
        expect(parseFitDefaultsPatch(bad), JSON.stringify(bad)).toBeNull();
      }
    });

    it("mergeFitDefaultsPatch changes only the keys the patch carries", () => {
      const stored = { ...SEVEN_NULLS, extraLength: inchesToMm(3), widthMargin: inchesToMm(2), tipStyle: "bottom" as const };
      expect(mergeFitDefaultsPatch(stored, { noseTipThickness: inchesToMm(0.5) })).toEqual({
        ...stored,
        noseTipThickness: inchesToMm(0.5),
      });
      expect(mergeFitDefaultsPatch(stored, { widthMargin: null })).toEqual({ ...stored, widthMargin: null });
      expect(mergeFitDefaultsPatch(stored, { tipStyle: "pinDeck" })).toEqual({ ...stored, tipStyle: "pinDeck" });
      expect(mergeFitDefaultsPatch(stored, {})).toEqual(stored);
    });

    it("fitDefaultsUpdateSet names only the patched column and updatedAt", () => {
      const now = new Date(0);
      expect(fitDefaultsUpdateSet({ widthMargin: inchesToMm(2) }, now)).toEqual({
        [FIT_DEFAULTS_COLUMNS.widthMargin]: inchesToMm(2),
        updatedAt: now,
      });
      expect(fitDefaultsUpdateSet({ tipStyle: "bottom" }, now)).toEqual({
        [FIT_DEFAULTS_COLUMNS.tipStyle]: "bottom",
        updatedAt: now,
      });
      expect(Object.keys(fitDefaultsUpdateSet({ ...SEVEN_NULLS }, now)).sort()).toEqual(
        [...Object.values(FIT_DEFAULTS_COLUMNS), "updatedAt"].sort(),
      );
    });

    it("the insert and update column sets never carry the retired Extra Center Thickness column (D-19)", () => {
      const now = new Date(0);
      expect(Object.keys(fitDefaultsUpdateSet({ ...SEVEN_NULLS }, now))).not.toContain("extraCenterThicknessMm");
      expect(Object.keys(fitDefaultsInsertColumns({}))).not.toContain("extraCenterThicknessMm");
      expect(Object.keys(fitDefaultsInsertColumns({})).sort()).toEqual(Object.values(FIT_DEFAULTS_COLUMNS).sort());
    });

    it("fitDefaultsInsertColumns fills every absent setting with null on a first-time insert", () => {
      const columns = fitDefaultsInsertColumns({ tailTipThickness: inchesToMm(0.375), tipStyle: "bottom" });
      for (const key of FIT_DEFAULTS_KEYS) {
        const expected = key === "tailTipThickness" ? inchesToMm(0.375) : key === "tipStyle" ? "bottom" : null;
        expect(columns[FIT_DEFAULTS_COLUMNS[key]]).toBe(expected);
      }
    });
  });

  describe("writeFitDefaultsToBrowser — each store is written on its own (IN-02)", () => {
    const pref = { ...SEVEN_NULLS, widthMargin: inchesToMm(2) };

    it("with localStorage blocked, the cookie is still written", () => {
      const cookies: string[] = [];
      const result = writeFitDefaultsToBrowser(pref, {
        setStorage: () => {
          throw new Error("SecurityError: storage is blocked");
        },
        setCookie: (cookie) => cookies.push(cookie),
      });
      expect(result).toEqual({ storage: false, cookie: true });
      expect(cookies).toEqual([fitDefaultsCookieString(pref)]);
    });

    it("with cookies refused, localStorage is still written", () => {
      const stored: string[] = [];
      const result = writeFitDefaultsToBrowser(pref, {
        setStorage: (raw) => stored.push(raw),
        setCookie: () => {
          throw new Error("cookies refused");
        },
      });
      expect(result).toEqual({ storage: true, cookie: false });
      expect(stored.map((raw) => JSON.parse(raw))).toEqual([pref]);
    });

    it("writes both when both are allowed, and never throws when neither is", () => {
      const stored: string[] = [];
      const cookies: string[] = [];
      expect(writeFitDefaultsToBrowser(pref, { setStorage: (r) => stored.push(r), setCookie: (c) => cookies.push(c) })).toEqual({
        storage: true,
        cookie: true,
      });
      expect(stored).toHaveLength(1);
      expect(cookies).toHaveLength(1);
      const refuse = () => {
        throw new Error("no");
      };
      expect(writeFitDefaultsToBrowser(pref, { setStorage: refuse, setCookie: refuse })).toEqual({ storage: false, cookie: false });
    });
  });
});
