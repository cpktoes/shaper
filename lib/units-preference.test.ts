import { describe, expect, it, vi } from "vitest";
import type { UnitsSystem } from "./geometry/units";
import {
  DEFAULT_UNITS_SYSTEM,
  UNITS_COOKIE_MAX_AGE_SECONDS,
  UNITS_COOKIE_NAME,
  UNITS_STORAGE_KEY,
  UNITS_WRITE_RETRY_DELAYS_MS,
  createUnitsWriteQueue,
  decideUnitsHandoff,
  nextUnitsWriteRetryDelayMs,
  parseUnitsPreference,
  readUnitsCookie,
  resolveUnitsSystem,
  unitsCookieString,
} from "./units-preference";

/** Flushes as many microtask turns as the queue's `.then` chains need to settle — this module
 * never reaches for a real timer for the write itself, only for scheduled retries, so awaiting
 * a handful of already-resolved promises is enough to drive it deterministically. */
async function flushMicrotasks(): Promise<void> {
  for (let i = 0; i < 4; i++) {
    await Promise.resolve();
  }
}

/** A fake `setTimer`/`clearTimer` pair that records scheduled callbacks instead of actually
 * waiting, so retry-ladder tests never need real (or faked-global) timers. */
function createFakeScheduler() {
  interface Handle {
    cb: () => void;
    delay: number;
  }
  const scheduled: Handle[] = [];
  const setTimer = vi.fn((cb: () => void, delay: number): Handle => {
    const handle: Handle = { cb, delay };
    scheduled.push(handle);
    return handle;
  });
  const clearTimer = vi.fn((handle: unknown) => {
    const index = scheduled.indexOf(handle as Handle);
    if (index !== -1) scheduled.splice(index, 1);
  });
  async function runNext(): Promise<void> {
    const handle = scheduled.shift();
    if (!handle) throw new Error("no timer was scheduled");
    handle.cb();
    await flushMicrotasks();
  }
  return { setTimer, clearTimer, scheduled, runNext };
}

describe("units preference boundary", () => {
  it("exposes the storage key and cookie name as shaper-units", () => {
    expect(UNITS_STORAGE_KEY).toBe("shaper-units");
    expect(UNITS_COOKIE_NAME).toBe("shaper-units");
  });

  it("defaults to imperial", () => {
    expect(DEFAULT_UNITS_SYSTEM).toBe("imperial");
  });

  describe("parseUnitsPreference", () => {
    it("passes through the two known systems", () => {
      expect(parseUnitsPreference("imperial")).toBe("imperial");
      expect(parseUnitsPreference("metric")).toBe("metric");
    });

    it("returns null — never a default — for anything unrecognised or absent", () => {
      for (const junk of [null, undefined, "", "IMPERIAL", "inches", 123, {}]) {
        expect(parseUnitsPreference(junk)).toBeNull();
      }
    });
  });

  describe("resolveUnitsSystem", () => {
    it("resolves no preference to imperial", () => {
      expect(resolveUnitsSystem(null)).toBe("imperial");
    });

    it("resolves an explicit preference to itself", () => {
      expect(resolveUnitsSystem("metric")).toBe("metric");
    });
  });

  describe("readUnitsCookie", () => {
    it("finds the units cookie among others", () => {
      expect(readUnitsCookie("shaper-theme=slate; shaper-units=metric; other=1")).toBe("metric");
    });

    it("returns null for an empty or missing cookie header", () => {
      expect(readUnitsCookie("")).toBeNull();
      expect(readUnitsCookie(null)).toBeNull();
      expect(readUnitsCookie(undefined)).toBeNull();
    });

    it("returns null for a cookie carrying a junk value", () => {
      expect(readUnitsCookie("shaper-units=bogus")).toBeNull();
    });
  });

  describe("unitsCookieString", () => {
    it("carries the cookie name, value, Path, Max-Age and SameSite", () => {
      const cookie = unitsCookieString("metric");
      expect(cookie).toContain("shaper-units=metric");
      expect(cookie).toContain("Path=/");
      expect(cookie).toContain(`Max-Age=${UNITS_COOKIE_MAX_AGE_SECONDS}`);
      expect(cookie).toContain("SameSite=Lax");
      expect(UNITS_COOKIE_MAX_AGE_SECONDS).toBe(31_536_000);
    });
  });

  describe("decideUnitsHandoff", () => {
    it("signed out with a browser value: that system, nothing adopted, nothing promoted", () => {
      expect(decideUnitsHandoff({ signedIn: false, account: null, browser: "metric" })).toEqual({
        system: "metric",
        adoptIntoBrowser: null,
        promoteToAccount: null,
      });
    });

    it("signed out with no browser value: Imperial, nothing adopted, nothing promoted", () => {
      expect(decideUnitsHandoff({ signedIn: false, account: null, browser: null })).toEqual({
        system: "imperial",
        adoptIntoBrowser: null,
        promoteToAccount: null,
      });
    });

    it("signed in with an account value: the account's system, adopted into the browser, nothing promoted", () => {
      // Browser holds nothing.
      expect(decideUnitsHandoff({ signedIn: true, account: "metric", browser: null })).toEqual({
        system: "metric",
        adoptIntoBrowser: "metric",
        promoteToAccount: null,
      });
      // Browser holds a DIFFERENT explicit value — the account still wins outright.
      expect(decideUnitsHandoff({ signedIn: true, account: "metric", browser: "imperial" })).toEqual({
        system: "metric",
        adoptIntoBrowser: "metric",
        promoteToAccount: null,
      });
    });

    it("signed in with no account value but an explicit browser value: the browser's system, nothing adopted, promoted to the account", () => {
      expect(decideUnitsHandoff({ signedIn: true, account: null, browser: "metric" })).toEqual({
        system: "metric",
        adoptIntoBrowser: null,
        promoteToAccount: "metric",
      });
    });

    it("signed in with neither: Imperial, nothing adopted, nothing promoted — a default nobody chose is never written", () => {
      expect(decideUnitsHandoff({ signedIn: true, account: null, browser: null })).toEqual({
        system: "imperial",
        adoptIntoBrowser: null,
        promoteToAccount: null,
      });
    });

    it("promoteToAccount is never non-null when account is non-null", () => {
      const result = decideUnitsHandoff({ signedIn: true, account: "imperial", browser: "metric" });
      expect(result.promoteToAccount).toBeNull();
    });
  });

  describe("UNITS_WRITE_RETRY_DELAYS_MS / nextUnitsWriteRetryDelayMs", () => {
    it("the ladder is non-empty and strictly increasing", () => {
      expect(UNITS_WRITE_RETRY_DELAYS_MS.length).toBeGreaterThan(0);
      for (let i = 1; i < UNITS_WRITE_RETRY_DELAYS_MS.length; i++) {
        expect(UNITS_WRITE_RETRY_DELAYS_MS[i]).toBeGreaterThan(UNITS_WRITE_RETRY_DELAYS_MS[i - 1]);
      }
    });

    it("returns the first, second and third rungs for attempts 0, 1 and 2", () => {
      expect(nextUnitsWriteRetryDelayMs(0)).toBe(UNITS_WRITE_RETRY_DELAYS_MS[0]);
      expect(nextUnitsWriteRetryDelayMs(1)).toBe(UNITS_WRITE_RETRY_DELAYS_MS[1]);
      expect(nextUnitsWriteRetryDelayMs(2)).toBe(UNITS_WRITE_RETRY_DELAYS_MS[2]);
    });

    it("returns null once the ladder is exhausted — the write gives up quietly rather than retrying forever", () => {
      expect(nextUnitsWriteRetryDelayMs(UNITS_WRITE_RETRY_DELAYS_MS.length)).toBeNull();
    });

    it("returns the first delay for a negative attempt — a defensive floor, not a throw", () => {
      expect(nextUnitsWriteRetryDelayMs(-1)).toBe(UNITS_WRITE_RETRY_DELAYS_MS[0]);
    });
  });

  describe("createUnitsWriteQueue (WR-01: serialized account writes)", () => {
    it("a second pick while the first write is in flight results in exactly one more write, for the newer value, after the first SUCCEEDS", async () => {
      const calls: UnitsSystem[] = [];
      let resolveFirst!: () => void;
      const firstPromise = new Promise<void>((resolve) => {
        resolveFirst = resolve;
      });
      const save = vi.fn((system: UnitsSystem) => {
        calls.push(system);
        return calls.length === 1 ? firstPromise : Promise.resolve();
      });
      const { setTimer, clearTimer } = createFakeScheduler();
      const queue = createUnitsWriteQueue({ save, setTimer, clearTimer });

      queue.request("metric");
      queue.request("imperial"); // picked again while "metric" is still in flight
      await flushMicrotasks();
      expect(calls).toEqual(["metric"]); // no overlapping second call fired

      resolveFirst();
      await flushMicrotasks();

      expect(calls).toEqual(["metric", "imperial"]); // the last pick lands last, once the first settles
      expect(save).toHaveBeenCalledTimes(2);
    });

    it("a second pick while the first write is in flight results in exactly one more write, for the newer value, after the first FAILS", async () => {
      const calls: UnitsSystem[] = [];
      let rejectFirst!: (error: Error) => void;
      const firstPromise = new Promise<void>((_resolve, reject) => {
        rejectFirst = reject;
      });
      const save = vi.fn((system: UnitsSystem) => {
        calls.push(system);
        return calls.length === 1 ? firstPromise : Promise.resolve();
      });
      const { setTimer, clearTimer } = createFakeScheduler();
      const queue = createUnitsWriteQueue({ save, setTimer, clearTimer });

      queue.request("metric");
      queue.request("imperial"); // picked again while "metric" is still in flight
      await flushMicrotasks();
      expect(calls).toEqual(["metric"]);

      rejectFirst(new Error("network blip"));
      await flushMicrotasks();

      // The failed value is no longer desired, so no retry ladder for it — a fresh attempt for
      // the newer pick starts immediately instead.
      expect(calls).toEqual(["metric", "imperial"]);
      expect(save).toHaveBeenCalledTimes(2);
    });

    it("a rejected write whose value is still desired retries on the ladder and gives up after it is exhausted", async () => {
      const save = vi.fn(() => Promise.reject(new Error("still down")));
      const { setTimer, clearTimer, scheduled, runNext } = createFakeScheduler();
      const queue = createUnitsWriteQueue({ save, setTimer, clearTimer });

      queue.request("metric");
      await flushMicrotasks();
      expect(save).toHaveBeenCalledTimes(1);
      expect(scheduled).toHaveLength(1);
      expect(scheduled[0].delay).toBe(UNITS_WRITE_RETRY_DELAYS_MS[0]);

      await runNext();
      expect(save).toHaveBeenCalledTimes(2);
      expect(scheduled).toHaveLength(1);
      expect(scheduled[0].delay).toBe(UNITS_WRITE_RETRY_DELAYS_MS[1]);

      await runNext();
      expect(save).toHaveBeenCalledTimes(3);
      expect(scheduled).toHaveLength(1);
      expect(scheduled[0].delay).toBe(UNITS_WRITE_RETRY_DELAYS_MS[2]);

      await runNext();
      expect(save).toHaveBeenCalledTimes(4);
      expect(scheduled).toHaveLength(0); // ladder exhausted — no further retry scheduled
    });

    it("a pick that changes the desired value cancels a pending retry timer", async () => {
      const save = vi
        .fn<(system: UnitsSystem) => Promise<void>>()
        .mockImplementationOnce(() => Promise.reject(new Error("first fails")))
        .mockImplementation(() => Promise.resolve());
      const { setTimer, clearTimer, scheduled } = createFakeScheduler();
      const queue = createUnitsWriteQueue({ save, setTimer, clearTimer });

      queue.request("metric");
      await flushMicrotasks();
      expect(scheduled).toHaveLength(1);
      expect(clearTimer).not.toHaveBeenCalled();

      queue.request("imperial");
      expect(clearTimer).toHaveBeenCalledTimes(1);
      expect(scheduled).toHaveLength(0); // the stale retry for "metric" never fires

      await flushMicrotasks();
      expect(save).toHaveBeenLastCalledWith("imperial");
    });

    it("dispose() cancels the pending timer", async () => {
      const save = vi.fn(() => Promise.reject(new Error("down")));
      const { setTimer, clearTimer, scheduled } = createFakeScheduler();
      const queue = createUnitsWriteQueue({ save, setTimer, clearTimer });

      queue.request("metric");
      await flushMicrotasks();
      expect(scheduled).toHaveLength(1);

      queue.dispose();
      expect(clearTimer).toHaveBeenCalledTimes(1);
      expect(scheduled).toHaveLength(0);
    });
  });
});
