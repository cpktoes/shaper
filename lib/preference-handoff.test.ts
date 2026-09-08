import { afterEach, describe, expect, it, vi } from "vitest";
import {
  PREFERENCE_WRITE_RETRY_DELAYS_MS,
  createPreferenceWriteQueue,
  decidePreferenceHandoff,
  nextPreferenceWriteRetryDelayMs,
} from "./preference-handoff";

/** Flushes as many microtask turns as the queue's `.then` chains need to settle — mirrors
 * lib/units-preference.test.ts's own helper. */
async function flushMicrotasks(): Promise<void> {
  for (let i = 0; i < 4; i++) {
    await Promise.resolve();
  }
}

/** A fake `setTimer`/`clearTimer` pair that records scheduled callbacks instead of actually
 * waiting, mirroring lib/units-preference.test.ts's own helper. */
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

type Enum = "imperial" | "metric";

describe("generic preference handoff (used by both units and print-instructions)", () => {
  describe("decidePreferenceHandoff — boolean-valued", () => {
    it("signed in with an account value: the account value, adopted into the browser, nothing promoted — even when the browser held a different explicit value", () => {
      expect(
        decidePreferenceHandoff<boolean>({ signedIn: true, account: false, browser: true, fallback: false }),
      ).toEqual({ value: false, adoptIntoBrowser: false, promoteToAccount: null });
    });

    it("signed in, null account, non-null browser: the browser value, adopts nothing, promotes the browser value", () => {
      expect(
        decidePreferenceHandoff<boolean>({ signedIn: true, account: null, browser: true, fallback: false }),
      ).toEqual({ value: true, adoptIntoBrowser: null, promoteToAccount: true });
    });

    it("signed in, both null: the fallback, adopts nothing, promotes nothing — a default nobody chose is never written to an account", () => {
      expect(
        decidePreferenceHandoff<boolean>({ signedIn: true, account: null, browser: null, fallback: false }),
      ).toEqual({ value: false, adoptIntoBrowser: null, promoteToAccount: null });
    });

    it("signed out, non-null browser value: that value, adopts nothing, promotes nothing", () => {
      expect(
        decidePreferenceHandoff<boolean>({ signedIn: false, account: null, browser: true, fallback: false }),
      ).toEqual({ value: true, adoptIntoBrowser: null, promoteToAccount: null });
    });

    it("signed out, null browser value: the fallback, adopts nothing, promotes nothing", () => {
      expect(
        decidePreferenceHandoff<boolean>({ signedIn: false, account: null, browser: null, fallback: false }),
      ).toEqual({ value: false, adoptIntoBrowser: null, promoteToAccount: null });
    });
  });

  describe("decidePreferenceHandoff — string-enum-valued (the same five branches hold for any value type)", () => {
    it("signed in with an account value: the account value, adopted into the browser, nothing promoted — even when the browser held a different explicit value", () => {
      expect(
        decidePreferenceHandoff<Enum>({ signedIn: true, account: "metric", browser: "imperial", fallback: "imperial" }),
      ).toEqual({ value: "metric", adoptIntoBrowser: "metric", promoteToAccount: null });
    });

    it("signed in, null account, non-null browser: the browser value, adopts nothing, promotes the browser value", () => {
      expect(
        decidePreferenceHandoff<Enum>({ signedIn: true, account: null, browser: "metric", fallback: "imperial" }),
      ).toEqual({ value: "metric", adoptIntoBrowser: null, promoteToAccount: "metric" });
    });

    it("signed in, both null: the fallback, adopts nothing, promotes nothing", () => {
      expect(
        decidePreferenceHandoff<Enum>({ signedIn: true, account: null, browser: null, fallback: "imperial" }),
      ).toEqual({ value: "imperial", adoptIntoBrowser: null, promoteToAccount: null });
    });

    it("signed out, non-null browser value: that value, adopts nothing, promotes nothing", () => {
      expect(
        decidePreferenceHandoff<Enum>({ signedIn: false, account: null, browser: "metric", fallback: "imperial" }),
      ).toEqual({ value: "metric", adoptIntoBrowser: null, promoteToAccount: null });
    });

    it("signed out, null browser value: the fallback, adopts nothing, promotes nothing", () => {
      expect(
        decidePreferenceHandoff<Enum>({ signedIn: false, account: null, browser: null, fallback: "imperial" }),
      ).toEqual({ value: "imperial", adoptIntoBrowser: null, promoteToAccount: null });
    });

    it("promoteToAccount is never non-null when account is non-null", () => {
      const result = decidePreferenceHandoff<Enum>({
        signedIn: true,
        account: "imperial",
        browser: "metric",
        fallback: "imperial",
      });
      expect(result.promoteToAccount).toBeNull();
    });
  });

  describe("PREFERENCE_WRITE_RETRY_DELAYS_MS / nextPreferenceWriteRetryDelayMs", () => {
    it("the ladder is non-empty and strictly increasing", () => {
      expect(PREFERENCE_WRITE_RETRY_DELAYS_MS.length).toBeGreaterThan(0);
      for (let i = 1; i < PREFERENCE_WRITE_RETRY_DELAYS_MS.length; i++) {
        expect(PREFERENCE_WRITE_RETRY_DELAYS_MS[i]).toBeGreaterThan(PREFERENCE_WRITE_RETRY_DELAYS_MS[i - 1]);
      }
    });

    it("returns the first, second and third rungs for attempts 0, 1 and 2", () => {
      expect(nextPreferenceWriteRetryDelayMs(0)).toBe(PREFERENCE_WRITE_RETRY_DELAYS_MS[0]);
      expect(nextPreferenceWriteRetryDelayMs(1)).toBe(PREFERENCE_WRITE_RETRY_DELAYS_MS[1]);
      expect(nextPreferenceWriteRetryDelayMs(2)).toBe(PREFERENCE_WRITE_RETRY_DELAYS_MS[2]);
    });

    it("returns null once the ladder is exhausted", () => {
      expect(nextPreferenceWriteRetryDelayMs(PREFERENCE_WRITE_RETRY_DELAYS_MS.length)).toBeNull();
    });
  });

  describe("createPreferenceWriteQueue", () => {
    const consoleErrorSpy = vi.spyOn(console, "error").mockImplementation(() => {});

    afterEach(() => {
      consoleErrorSpy.mockClear();
    });

    it("runs at most one save at a time, starting the second only after the first settles", async () => {
      const calls: boolean[] = [];
      let resolveFirst!: () => void;
      const firstPromise = new Promise<void>((resolve) => {
        resolveFirst = resolve;
      });
      const save = vi.fn((value: boolean) => {
        calls.push(value);
        return calls.length === 1 ? firstPromise : Promise.resolve();
      });
      const { setTimer, clearTimer } = createFakeScheduler();
      const queue = createPreferenceWriteQueue<boolean>({ save, setTimer, clearTimer });

      queue.request(true);
      queue.request(false); // picked again while the first save is still in flight
      await flushMicrotasks();
      expect(calls).toEqual([true]); // no overlapping second call fired

      resolveFirst();
      await flushMicrotasks();

      expect(calls).toEqual([true, false]); // the last pick lands last, once the first settles
      expect(save).toHaveBeenCalledTimes(2);
    });

    it("retries a failed save on the bounded ladder and stops after the ladder is exhausted", async () => {
      const save = vi.fn(() => Promise.reject(new Error("still down")));
      const { setTimer, clearTimer, scheduled, runNext } = createFakeScheduler();
      const queue = createPreferenceWriteQueue<boolean>({ save, setTimer, clearTimer });

      queue.request(true);
      await flushMicrotasks();
      expect(save).toHaveBeenCalledTimes(1);
      expect(scheduled).toHaveLength(1);
      expect(scheduled[0].delay).toBe(PREFERENCE_WRITE_RETRY_DELAYS_MS[0]);

      await runNext();
      expect(save).toHaveBeenCalledTimes(2);
      expect(scheduled[0].delay).toBe(PREFERENCE_WRITE_RETRY_DELAYS_MS[1]);

      await runNext();
      expect(save).toHaveBeenCalledTimes(3);
      expect(scheduled[0].delay).toBe(PREFERENCE_WRITE_RETRY_DELAYS_MS[2]);

      await runNext();
      expect(save).toHaveBeenCalledTimes(4);
      expect(scheduled).toHaveLength(0); // ladder exhausted — no further retry scheduled
      expect(consoleErrorSpy).toHaveBeenCalledTimes(1); // logged once on abandonment
    });

    it("dispose() cancels a pending retry timer", async () => {
      const save = vi.fn(() => Promise.reject(new Error("down")));
      const { setTimer, clearTimer, scheduled } = createFakeScheduler();
      const queue = createPreferenceWriteQueue<boolean>({ save, setTimer, clearTimer });

      queue.request(true);
      await flushMicrotasks();
      expect(scheduled).toHaveLength(1);

      queue.dispose();
      expect(clearTimer).toHaveBeenCalledTimes(1);
      expect(scheduled).toHaveLength(0);
    });
  });
});
