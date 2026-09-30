import { describe, expect, it } from "vitest";
import { FORCED_ERROR_ENV, FORCED_ERROR_MESSAGE, FORCED_ERROR_ROUTE, forcedErrorRouteEnabled } from "./forced-error";
import { ERROR_COPY, NOT_FOUND_COPY } from "./copy";

/**
 * TDD RED for quick 260930-fjm, Task 3: the forced-error switch (P-4), pinned exactly like
 * `resolveContactDelivery`'s own boundary test — honoured only outside a production build AND
 * with the flag exactly "1".
 */

describe("FORCED_ERROR_ROUTE / FORCED_ERROR_ENV / FORCED_ERROR_MESSAGE", () => {
  it("FORCED_ERROR_ROUTE is /test-error", () => {
    expect(FORCED_ERROR_ROUTE).toBe("/test-error");
  });

  it("FORCED_ERROR_ENV is SHAPER_FORCED_ERROR", () => {
    expect(FORCED_ERROR_ENV).toBe("SHAPER_FORCED_ERROR");
  });

  it("FORCED_ERROR_MESSAGE is a non-empty sentence that appears in no copy module", () => {
    expect(FORCED_ERROR_MESSAGE.length).toBeGreaterThan(0);
    const copyStrings = [...Object.values(ERROR_COPY), ...Object.values(NOT_FOUND_COPY)];
    for (const s of copyStrings) {
      expect(s).not.toContain(FORCED_ERROR_MESSAGE);
      expect(FORCED_ERROR_MESSAGE).not.toContain(s);
    }
  });
});

describe("forcedErrorRouteEnabled", () => {
  it("is false in production even with the flag on", () => {
    expect(forcedErrorRouteEnabled({ nodeEnv: "production", flag: "1" })).toBe(false);
  });

  it("is true in development with the flag on", () => {
    expect(forcedErrorRouteEnabled({ nodeEnv: "development", flag: "1" })).toBe(true);
  });

  it("is true in test with the flag on", () => {
    expect(forcedErrorRouteEnabled({ nodeEnv: "test", flag: "1" })).toBe(true);
  });

  it("is true with an undefined nodeEnv and the flag on (the contact stand-in's rule)", () => {
    expect(forcedErrorRouteEnabled({ nodeEnv: undefined, flag: "1" })).toBe(true);
  });

  it("is false in development with no flag", () => {
    expect(forcedErrorRouteEnabled({ nodeEnv: "development", flag: undefined })).toBe(false);
  });

  it("is false in development with flag 'true' (not the exact string '1')", () => {
    expect(forcedErrorRouteEnabled({ nodeEnv: "development", flag: "true" })).toBe(false);
  });

  it("is false in development with flag ' 1' (not exactly '1')", () => {
    expect(forcedErrorRouteEnabled({ nodeEnv: "development", flag: " 1" })).toBe(false);
  });
});
