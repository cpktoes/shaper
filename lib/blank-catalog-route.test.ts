import { afterEach, describe, expect, it, vi } from "vitest";
import { isWellFormedBlankRecord } from "@/lib/blanks/catalog";

/**
 * The blank catalogue route (quick 261113-gwo): the board-file preview's way to the catalogue. It is public and read-only, so
 * the tests prove it answers a request that carries nothing, passes the loader's answer through untouched, and answers 200
 * even when the catalogue could not load (the preview then says so quietly).
 */

afterEach(() => {
  vi.unstubAllEnvs();
  vi.doUnmock("@/lib/db/blanks");
  vi.resetModules();
});

describe("GET /api/blank-catalog", () => {
  it("answers the committed catalogue, every blank well formed, to a call that carries nothing", async () => {
    vi.stubEnv("SHAPER_BLANKS_SOURCE", "seed-csv");
    const { GET } = await import("@/app/api/blank-catalog/route");
    const response = await GET();
    expect(response.status).toBe(200);
    const body = await response.json();
    expect(body.status).toBe("ok");
    expect(body.blanks.length).toBeGreaterThan(100);
    expect(body.blanks.every((blank: unknown) => isWellFormedBlankRecord(blank))).toBe(true);
  });

  it("passes the loader's answer through untouched, a failure to load included, still as a 200", async () => {
    vi.resetModules();
    vi.doMock("@/lib/db/blanks", () => ({ loadPickableBlanks: async () => ({ status: "unavailable" }) }));
    const { GET } = await import("@/app/api/blank-catalog/route");
    const response = await GET();
    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ status: "unavailable" });
  });
});
