import { afterEach, describe, expect, it } from "vitest";
import {
  BANNER_DISMISSAL_KEY,
  readBannerDismissal,
  shouldShowSignInBanner,
  writeBannerDismissal,
} from "./banner-dismissal";

describe("shouldShowSignInBanner", () => {
  it("signed out and not dismissed: offers the payoff", () => {
    expect(shouldShowSignInBanner({ signedIn: false, dismissed: false })).toBe(true);
  });

  it("signed out and dismissed: stays hidden for the rest of the visit", () => {
    expect(shouldShowSignInBanner({ signedIn: false, dismissed: true })).toBe(false);
  });

  it("signed in and not dismissed: a shaper who already has an account is not offered one", () => {
    expect(shouldShowSignInBanner({ signedIn: true, dismissed: false })).toBe(false);
  });

  it("signed in and dismissed: still hidden", () => {
    expect(shouldShowSignInBanner({ signedIn: true, dismissed: true })).toBe(false);
  });
});

describe("BANNER_DISMISSAL_KEY", () => {
  it("is a stable, non-empty string", () => {
    expect(typeof BANNER_DISMISSAL_KEY).toBe("string");
    expect(BANNER_DISMISSAL_KEY.length).toBeGreaterThan(0);
  });
});

/** Minimal sessionStorage stand-in, following lib/theme.test.ts's fakeRoot pattern. */
function fakeSessionStorage(initial: Record<string, string> = {}) {
  const store = new Map(Object.entries(initial));
  return {
    getItem: (key: string) => (store.has(key) ? (store.get(key) as string) : null),
    setItem: (key: string, value: string) => void store.set(key, value),
    removeItem: (key: string) => void store.delete(key),
  };
}

describe("readBannerDismissal / writeBannerDismissal", () => {
  afterEach(() => {
    // @ts-expect-error test-only cleanup of a global these functions deliberately read through
    // a try/catch, so a stray fake from one test must not leak into the next.
    delete globalThis.sessionStorage;
  });

  it("returns false rather than throwing when sessionStorage does not exist at all", () => {
    // No sessionStorage global — the node test environment's default state, and also what a
    // server render sees.
    expect(() => readBannerDismissal()).not.toThrow();
    expect(readBannerDismissal()).toBe(false);
  });

  it("reads back what writeBannerDismissal wrote", () => {
    // @ts-expect-error assigning a fake sessionStorage for the node test environment
    globalThis.sessionStorage = fakeSessionStorage();
    expect(readBannerDismissal()).toBe(false);
    writeBannerDismissal();
    expect(readBannerDismissal()).toBe(true);
  });

  it("returns false for an unexpected stored value rather than throwing", () => {
    // @ts-expect-error assigning a fake sessionStorage for the node test environment
    globalThis.sessionStorage = fakeSessionStorage({ [BANNER_DISMISSAL_KEY]: "yes" });
    expect(readBannerDismissal()).toBe(false);
  });

  it("does not throw when storage access itself throws (Safari private mode, blocked cookies)", () => {
    // @ts-expect-error simulating a browser where sessionStorage access throws, the same
    // failure mode lib/theme.ts's THEME_INIT_SCRIPT guards against.
    globalThis.sessionStorage = {
      getItem: () => {
        throw new Error("SecurityError");
      },
      setItem: () => {
        throw new Error("SecurityError");
      },
    };
    expect(() => readBannerDismissal()).not.toThrow();
    expect(readBannerDismissal()).toBe(false);
    expect(() => writeBannerDismissal()).not.toThrow();
  });
});
