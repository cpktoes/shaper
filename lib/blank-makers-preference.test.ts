import { describe, expect, it } from "vitest";
import {
  BLANK_MAKERS_COOKIE_MAX_AGE_SECONDS,
  BLANK_MAKERS_COOKIE_NAME,
  BLANK_MAKERS_STORAGE_KEY,
  blankMakersCookieString,
  decideBlankMakersHandoff,
  hiddenBlankMakersColumnValue,
  isLastShownMaker,
  parseBlankMakersCookieValue,
  parseHiddenBlankMakers,
  parseHiddenBlankMakersColumn,
  parseHiddenBlankMakersInput,
  readBlankMakersCookie,
  withMakerShown,
  writeBlankMakersToBrowser,
} from "./blank-makers-preference";

describe("blank makers preference boundary", () => {
  it("exposes the storage key and cookie name as shaper-blank-makers, kept for a year", () => {
    expect(BLANK_MAKERS_STORAGE_KEY).toBe("shaper-blank-makers");
    expect(BLANK_MAKERS_COOKIE_NAME).toBe("shaper-blank-makers");
    expect(BLANK_MAKERS_COOKIE_MAX_AGE_SECONDS).toBe(31_536_000);
  });

  describe("parseHiddenBlankMakers", () => {
    it("keeps known makers only, exact case, without repeats, in catalogue order", () => {
      expect(parseHiddenBlankMakers(["Marko Foam", "Arctic Foam"])).toEqual(["Arctic Foam", "Marko Foam"]);
      expect(parseHiddenBlankMakers(["Arctic Foam", "Arctic Foam"])).toEqual(["Arctic Foam"]);
      expect(parseHiddenBlankMakers(["arctic foam", "Clark Foam", 3, null, "Marko Foam"])).toEqual(["Marko Foam"]);
      expect(parseHiddenBlankMakers([])).toEqual([]);
    });

    it("reads anything that is not a list as not chosen", () => {
      for (const junk of [null, undefined, "Arctic Foam", 3, {}, { 0: "Arctic Foam" }, true]) {
        expect(parseHiddenBlankMakers(junk), JSON.stringify(junk)).toBeNull();
      }
    });

    it("reads a list hiding every maker as not chosen, so the blank list can never be emptied", () => {
      expect(parseHiddenBlankMakers(["US Blanks", "Arctic Foam", "Marko Foam"])).toBeNull();
      expect(parseHiddenBlankMakers(["Marko Foam", "US Blanks", "Arctic Foam", "Clark Foam"])).toBeNull();
    });

    it("reads a list of only unknown names as nothing hidden", () => {
      expect(parseHiddenBlankMakers(["Clark Foam", "Walker"])).toEqual([]);
    });
  });

  describe("the account column", () => {
    it("parseHiddenBlankMakersColumn reads the column's JSON text", () => {
      expect(parseHiddenBlankMakersColumn('["Arctic Foam"]')).toEqual(["Arctic Foam"]);
      expect(parseHiddenBlankMakersColumn("[]")).toEqual([]);
    });

    it("parseHiddenBlankMakersColumn reads null, empty, malformed or non-list text as not chosen, and never throws", () => {
      for (const junk of [null, undefined, "", "not-json", "[oops", '"Arctic Foam"', "{}", "12"]) {
        expect(() => parseHiddenBlankMakersColumn(junk)).not.toThrow();
        expect(parseHiddenBlankMakersColumn(junk), String(junk)).toBeNull();
      }
    });

    it("hiddenBlankMakersColumnValue writes text that reads back unchanged", () => {
      for (const hidden of [[], ["Arctic Foam"], ["US Blanks", "Marko Foam"]] as const) {
        expect(parseHiddenBlankMakersColumn(hiddenBlankMakersColumnValue(hidden))).toEqual(hidden);
      }
      expect(hiddenBlankMakersColumnValue(["Arctic Foam"])).toBe('["Arctic Foam"]');
    });
  });

  describe("parseHiddenBlankMakersInput (the save's strict reader)", () => {
    it("accepts a list of known makers and returns it in catalogue order", () => {
      expect(parseHiddenBlankMakersInput([])).toEqual([]);
      expect(parseHiddenBlankMakersInput(["Marko Foam", "US Blanks"])).toEqual(["US Blanks", "Marko Foam"]);
    });

    it("rejects the whole call for anything else", () => {
      for (const bad of [
        null,
        undefined,
        "Arctic Foam",
        { hidden: ["Arctic Foam"] },
        ["arctic foam"],
        ["Arctic Foam", "Clark Foam"],
        ["Arctic Foam", 3],
        ["Arctic Foam", "Arctic Foam"],
        ["US Blanks", "Arctic Foam", "Marko Foam"],
        ["US Blanks", "Arctic Foam", "Marko Foam", "Marko Foam"],
        ["Arctic Foam", null],
      ]) {
        expect(parseHiddenBlankMakersInput(bad), JSON.stringify(bad)).toBeNull();
      }
    });
  });

  describe("cookie", () => {
    it("blankMakersCookieString carries the encoded JSON, Path, Max-Age and SameSite — no Secure, no HttpOnly", () => {
      const cookie = blankMakersCookieString(["Arctic Foam"]);
      expect(cookie).toBe(
        `shaper-blank-makers=${encodeURIComponent(JSON.stringify(["Arctic Foam"]))}; Path=/; Max-Age=31536000; SameSite=Lax`,
      );
      expect(cookie).not.toContain("Secure");
      expect(cookie).not.toContain("HttpOnly");
    });

    it("parseBlankMakersCookieValue reads the value part back", () => {
      expect(parseBlankMakersCookieValue(encodeURIComponent(JSON.stringify(["Marko Foam"])))).toEqual(["Marko Foam"]);
      expect(parseBlankMakersCookieValue(encodeURIComponent("[]"))).toEqual([]);
    });

    it("parseBlankMakersCookieValue gives not chosen for a missing, undecodable or junk value, and never throws", () => {
      for (const junk of [null, undefined, "", "%E0%A4%A", "not-json", encodeURIComponent("[oops"), "12"]) {
        expect(() => parseBlankMakersCookieValue(junk)).not.toThrow();
        expect(parseBlankMakersCookieValue(junk)).toBeNull();
      }
    });

    it("readBlankMakersCookie round-trips the whole cookie string among others", () => {
      const cookieValue = blankMakersCookieString(["Arctic Foam", "Marko Foam"]).split(";")[0];
      expect(readBlankMakersCookie(`shaper-units=metric; ${cookieValue}; other=1`)).toEqual([
        "Arctic Foam",
        "Marko Foam",
      ]);
    });

    it("readBlankMakersCookie gives not chosen for a missing header, a missing cookie or a junk value", () => {
      for (const header of [null, undefined, "", "shaper-units=metric; other=1", "shaper-blank-makers=%E0%A4%A", "shaper-blank-makers="]) {
        expect(() => readBlankMakersCookie(header)).not.toThrow();
        expect(readBlankMakersCookie(header)).toBeNull();
      }
    });
  });

  describe("writeBlankMakersToBrowser", () => {
    it("writes both stores", () => {
      const writes: string[] = [];
      const result = writeBlankMakersToBrowser(["Arctic Foam"], {
        setStorage: (raw) => writes.push(`storage:${raw}`),
        setCookie: (cookie) => writes.push(`cookie:${cookie}`),
      });
      expect(result).toEqual({ storage: true, cookie: true });
      expect(writes).toEqual([
        'storage:["Arctic Foam"]',
        `cookie:${blankMakersCookieString(["Arctic Foam"])}`,
      ]);
    });

    it("a refused storage write still sets the cookie, and the reverse", () => {
      const cookies: string[] = [];
      expect(
        writeBlankMakersToBrowser(["Arctic Foam"], {
          setStorage: () => {
            throw new Error("blocked");
          },
          setCookie: (cookie) => cookies.push(cookie),
        }),
      ).toEqual({ storage: false, cookie: true });
      expect(cookies).toHaveLength(1);

      const stored: string[] = [];
      expect(
        writeBlankMakersToBrowser(["Arctic Foam"], {
          setStorage: (raw) => stored.push(raw),
          setCookie: () => {
            throw new Error("blocked");
          },
        }),
      ).toEqual({ storage: true, cookie: false });
      expect(stored).toEqual(['["Arctic Foam"]']);
    });
  });

  describe("decideBlankMakersHandoff", () => {
    it("signed in with an account value: the account wins and is adopted into the browser", () => {
      expect(
        decideBlankMakersHandoff({ signedIn: true, account: ["Marko Foam"], browser: ["Arctic Foam"] }),
      ).toEqual({ hidden: ["Marko Foam"], adoptIntoBrowser: ["Marko Foam"], promoteToAccount: null });
    });

    it("signed in with only a browser value: it is promoted to the account", () => {
      expect(decideBlankMakersHandoff({ signedIn: true, account: null, browser: ["Arctic Foam"] })).toEqual({
        hidden: ["Arctic Foam"],
        adoptIntoBrowser: null,
        promoteToAccount: ["Arctic Foam"],
      });
    });

    it("signed in with neither: every maker shown, nothing written anywhere", () => {
      expect(decideBlankMakersHandoff({ signedIn: true, account: null, browser: null })).toEqual({
        hidden: [],
        adoptIntoBrowser: null,
        promoteToAccount: null,
      });
    });

    it("signed out: the browser value, or every maker shown; the account is ignored", () => {
      expect(decideBlankMakersHandoff({ signedIn: false, account: ["Marko Foam"], browser: ["Arctic Foam"] })).toEqual({
        hidden: ["Arctic Foam"],
        adoptIntoBrowser: null,
        promoteToAccount: null,
      });
      expect(decideBlankMakersHandoff({ signedIn: false, account: null, browser: null })).toEqual({
        hidden: [],
        adoptIntoBrowser: null,
        promoteToAccount: null,
      });
    });
  });

  describe("ticking and unticking", () => {
    it("isLastShownMaker is true only for the one maker still shown", () => {
      expect(isLastShownMaker([], "US Blanks")).toBe(false);
      expect(isLastShownMaker(["Arctic Foam"], "US Blanks")).toBe(false);
      expect(isLastShownMaker(["Arctic Foam", "Marko Foam"], "US Blanks")).toBe(true);
      expect(isLastShownMaker(["Arctic Foam", "Marko Foam"], "Arctic Foam")).toBe(false);
    });

    it("unticking hides a maker, and ticking shows it again, always in catalogue order", () => {
      expect(withMakerShown([], "Marko Foam", false)).toEqual(["Marko Foam"]);
      expect(withMakerShown(["Marko Foam"], "US Blanks", false)).toEqual(["US Blanks", "Marko Foam"]);
      expect(withMakerShown(["US Blanks", "Marko Foam"], "US Blanks", true)).toEqual(["Marko Foam"]);
      expect(withMakerShown([], "US Blanks", true)).toEqual([]);
    });

    it("refuses to hide the last maker still shown", () => {
      const hidden = ["Arctic Foam", "Marko Foam"] as const;
      expect(withMakerShown(hidden, "US Blanks", false)).toEqual(["Arctic Foam", "Marko Foam"]);
    });
  });
});
