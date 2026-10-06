import { describe, expect, it, vi } from "vitest";
import { RACK_ORDER_SAVE_DELAY_MS, createRackOrderSaver, type RackOrderSaverDeps } from "./rack-order-saver";

/** Flushes as many microtask turns as the saver's `.then` chains need to settle. */
async function flushMicrotasks(): Promise<void> {
  for (let i = 0; i < 4; i++) {
    await Promise.resolve();
  }
}

/** A fake `setTimer`/`clearTimer` pair that records scheduled callbacks instead of waiting —
 * the same recording scheduler `lib/preference-handoff.test.ts` uses. */
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

/** A `save` whose calls each wait until the test settles them, in order. */
function createControlledSave() {
  const calls: { ids: string[]; resolve: () => void; reject: (error: unknown) => void }[] = [];
  const save = vi.fn(
    (ids: string[]) =>
      new Promise<void>((resolve, reject) => {
        calls.push({ ids, resolve, reject });
      }),
  );
  return { save, calls };
}

function setup(lastSaved: readonly string[] | null = null, extra: Partial<RackOrderSaverDeps> = {}) {
  const scheduler = createFakeScheduler();
  const controlled = createControlledSave();
  const onFailed = vi.fn();
  const onSaved = vi.fn();
  const saver = createRackOrderSaver(lastSaved, {
    save: controlled.save,
    setTimer: scheduler.setTimer,
    clearTimer: scheduler.clearTimer,
    onFailed,
    onSaved,
    ...extra,
  });
  return { saver, ...scheduler, ...controlled, onFailed, onSaved };
}

describe("a burst of moves saves once", () => {
  it("waits the delay after the last request, then saves the last list once", async () => {
    const { saver, save, scheduled, runNext } = setup();

    saver.request(["b", "a", "c"]);
    saver.request(["b", "c", "a"]);
    saver.request(["c", "b", "a"]);

    expect(save).not.toHaveBeenCalled();
    expect(scheduled).toHaveLength(1);
    expect(scheduled[0].delay).toBe(RACK_ORDER_SAVE_DELAY_MS);
    expect(saver.pending()).toBe(true);

    await runNext();

    expect(save).toHaveBeenCalledTimes(1);
    expect(save).toHaveBeenCalledWith(["c", "b", "a"]);
  });

  it("uses the delay the caller hands in", () => {
    const { saver, scheduled } = setup(null, { delayMs: 50 });
    saver.request(["a"]);
    expect(scheduled[0].delay).toBe(50);
  });

  it("saves nothing for a list equal to the last saved one", () => {
    const { saver, save, scheduled } = setup(["a", "b"]);
    saver.request(["a", "b"]);
    expect(scheduled).toHaveLength(0);
    expect(save).not.toHaveBeenCalled();
    expect(saver.pending()).toBe(false);
  });

  it("a move and its move back inside the delay save nothing", () => {
    const { saver, save, scheduled } = setup(["a", "b"]);
    saver.request(["b", "a"]);
    saver.request(["a", "b"]);
    expect(scheduled).toHaveLength(0);
    expect(save).not.toHaveBeenCalled();
    expect(saver.pending()).toBe(false);
  });

  it("never holds on to the caller's array", async () => {
    const { saver, save, runNext } = setup();
    const ids = ["a", "b"];
    saver.request(ids);
    ids.reverse();
    await runNext();
    expect(save).toHaveBeenCalledWith(["a", "b"]);
  });

  it("reports a landed save and forgets it is pending", async () => {
    const { saver, calls, runNext, onSaved } = setup();
    saver.request(["a", "b"]);
    await runNext();
    expect(saver.pending()).toBe(true);
    calls[0].resolve();
    await flushMicrotasks();
    expect(onSaved).toHaveBeenCalledWith(["a", "b"]);
    expect(saver.pending()).toBe(false);
  });
});

describe("flush sends a pending list at once", () => {
  it("saves straight away, without waiting for the delay", () => {
    const { saver, save, scheduled } = setup();
    saver.request(["a", "b"]);
    saver.flush();
    expect(save).toHaveBeenCalledWith(["a", "b"]);
    expect(scheduled).toHaveLength(0);
  });

  it("does nothing when nothing is pending", () => {
    const { saver, save } = setup(["a"]);
    saver.flush();
    expect(save).not.toHaveBeenCalled();
  });
});

describe("at most one save in flight", () => {
  it("sends the newest list right after the in-flight save lands", async () => {
    const { saver, save, calls, runNext } = setup();

    saver.request(["a", "b"]);
    await runNext();
    expect(save).toHaveBeenCalledTimes(1);

    saver.request(["b", "a"]);
    saver.request(["b", "a", "c"]);
    expect(save).toHaveBeenCalledTimes(1); // still only one in flight

    calls[0].resolve();
    await flushMicrotasks();

    expect(save).toHaveBeenCalledTimes(2);
    expect(save).toHaveBeenLastCalledWith(["b", "a", "c"]);
  });

  it("a delay that runs out during a save waits for it to land", async () => {
    const { saver, save, calls, runNext } = setup();
    saver.request(["a", "b"]);
    await runNext();
    saver.request(["b", "a"]);
    await runNext();
    expect(save).toHaveBeenCalledTimes(1);
    calls[0].resolve();
    await flushMicrotasks();
    expect(save).toHaveBeenCalledTimes(2);
    expect(save).toHaveBeenLastCalledWith(["b", "a"]);
  });

  it("moving back to the stored list during a save still saves it after the save lands", async () => {
    const { saver, save, calls, runNext } = setup(["a", "b"]);
    saver.request(["b", "a"]);
    await runNext();
    saver.request(["a", "b"]);
    saver.flush();
    calls[0].resolve();
    await flushMicrotasks();
    expect(save).toHaveBeenCalledTimes(2);
    expect(save).toHaveBeenLastCalledWith(["a", "b"]);
  });

  it("drops a pending list that equals what just landed", async () => {
    const { saver, save, calls, runNext } = setup();
    saver.request(["a", "b"]);
    await runNext();
    saver.request(["b", "a"]);
    saver.request(["a", "b"]);
    saver.flush();
    calls[0].resolve();
    await flushMicrotasks();
    expect(save).toHaveBeenCalledTimes(1);
    expect(saver.pending()).toBe(false);
  });
});

describe("a failed save is reported so the rack can put the board back", () => {
  it("hands back the starting list when nothing has saved yet (possibly none)", async () => {
    const { saver, calls, runNext, onFailed } = setup(null);
    saver.request(["b", "a"]);
    await runNext();
    calls[0].reject(new Error("offline"));
    await flushMicrotasks();
    expect(onFailed).toHaveBeenCalledTimes(1);
    expect(onFailed).toHaveBeenCalledWith(null);
  });

  it("hands back the last list that did save, and drops anything pending", async () => {
    const { saver, save, calls, runNext, onFailed, scheduled } = setup(["a", "b", "c"]);

    saver.request(["b", "a", "c"]);
    await runNext();
    calls[0].resolve();
    await flushMicrotasks();

    saver.request(["b", "c", "a"]);
    await runNext();
    saver.request(["c", "b", "a"]); // pending behind the save about to fail

    calls[1].reject(new Error("offline"));
    await flushMicrotasks();

    expect(onFailed).toHaveBeenCalledWith(["b", "a", "c"]);
    expect(save).toHaveBeenCalledTimes(2);
    expect(scheduled).toHaveLength(0);
    expect(saver.pending()).toBe(false);
  });

  it("a save that throws straight away is reported the same way", async () => {
    const scheduler = createFakeScheduler();
    const onFailed = vi.fn();
    const saver = createRackOrderSaver(["a"], {
      save: () => {
        throw new Error("boom");
      },
      setTimer: scheduler.setTimer,
      clearTimer: scheduler.clearTimer,
      onFailed,
    });
    saver.request(["b", "a"]);
    saver.flush();
    await flushMicrotasks();
    expect(onFailed).toHaveBeenCalledWith(["a"]);
  });
});

describe("dispose", () => {
  it("cancels the delay and runs no callback even when an earlier save settles", async () => {
    const { saver, save, calls, runNext, onFailed, onSaved, scheduled } = setup();

    saver.request(["a", "b"]);
    await runNext();
    saver.request(["b", "a"]);
    saver.dispose();
    expect(scheduled).toHaveLength(0);

    calls[0].resolve();
    await flushMicrotasks();
    expect(onSaved).not.toHaveBeenCalled();
    expect(save).toHaveBeenCalledTimes(1);

    saver.request(["c"]);
    saver.flush();
    expect(save).toHaveBeenCalledTimes(1);
    expect(onFailed).not.toHaveBeenCalled();
  });

  it("runs no failure callback after dispose", async () => {
    const { saver, calls, runNext, onFailed } = setup();
    saver.request(["a"]);
    await runNext();
    saver.dispose();
    calls[0].reject(new Error("offline"));
    await flushMicrotasks();
    expect(onFailed).not.toHaveBeenCalled();
  });
});
