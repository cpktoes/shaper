import { afterEach, describe, expect, it } from "vitest";
import { BANNER_DISMISSAL_KEY } from "./banner-dismissal";
import {
  TOOLBAR_TIP_DISMISSAL_KEY,
  readToolbarTipDismissal,
  shouldShowToolbarTip,
  writeToolbarTipDismissal,
} from "./toolbar-tip";

describe("shouldShowToolbarTip", () => {
  it("not dismissed: show it", () => {
    expect(shouldShowToolbarTip({ dismissed: false })).toBe(true);
  });

  it("dismissed: stays hidden, permanently", () => {
    expect(shouldShowToolbarTip({ dismissed: true })).toBe(false);
  });
});

describe("TOOLBAR_TIP_DISMISSAL_KEY", () => {
  it("is a stable, non-empty string", () => {
    expect(typeof TOOLBAR_TIP_DISMISSAL_KEY).toBe("string");
    expect(TOOLBAR_TIP_DISMISSAL_KEY.length).toBeGreaterThan(0);
  });

  it("is not the same storage slot as the sign-in banner's own dismissal key", () => {
    // Two independent dismissals must never share one storage slot.
    expect(TOOLBAR_TIP_DISMISSAL_KEY).not.toBe(BANNER_DISMISSAL_KEY);
  });
});

/** Minimal localStorage stand-in, following banner-dismissal.test.ts's fakeSessionStorage pattern. */
function fakeLocalStorage(initial: Record<string, string> = {}) {
  const store = new Map(Object.entries(initial));
  return {
    getItem: (key: string) => (store.has(key) ? (store.get(key) as string) : null),
    setItem: (key: string, value: string) => void store.set(key, value),
    removeItem: (key: string) => void store.delete(key),
  };
}

describe("readToolbarTipDismissal / writeToolbarTipDismissal", () => {
  afterEach(() => {
    // @ts-expect-error test-only cleanup of a global these functions deliberately read through
    // a try/catch, so a stray fake from one test must not leak into the next.
    delete globalThis.localStorage;
  });

  it("returns false rather than throwing when localStorage does not exist at all", () => {
    // No localStorage global — the node test environment's default state, and also what a
    // server render sees.
    expect(() => readToolbarTipDismissal()).not.toThrow();
    expect(readToolbarTipDismissal()).toBe(false);
  });

  it("reads back what writeToolbarTipDismissal wrote", () => {
    // @ts-expect-error assigning a fake localStorage for the node test environment
    globalThis.localStorage = fakeLocalStorage();
    expect(readToolbarTipDismissal()).toBe(false);
    writeToolbarTipDismissal();
    expect(readToolbarTipDismissal()).toBe(true);
  });

  it("returns false for an unexpected stored value rather than throwing", () => {
    // @ts-expect-error assigning a fake localStorage for the node test environment
    globalThis.localStorage = fakeLocalStorage({ [TOOLBAR_TIP_DISMISSAL_KEY]: "yes" });
    expect(readToolbarTipDismissal()).toBe(false);
  });

  it("does not throw when storage access itself throws (Safari private mode, blocked cookies)", () => {
    // @ts-expect-error simulating a browser where localStorage access throws, the same failure
    // mode lib/theme.ts's THEME_INIT_SCRIPT guards against.
    globalThis.localStorage = {
      getItem: () => {
        throw new Error("SecurityError");
      },
      setItem: () => {
        throw new Error("SecurityError");
      },
    };
    expect(() => readToolbarTipDismissal()).not.toThrow();
    expect(readToolbarTipDismissal()).toBe(false);
    expect(() => writeToolbarTipDismissal()).not.toThrow();
  });
});
