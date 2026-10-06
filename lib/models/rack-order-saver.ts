/**
 * How the shaper's rack order reaches their account (Phase 15, UI-SPEC §5).
 *
 * The rack shows a move at once and saves it in the background. A burst of moves — a board walked
 * three places along with Alt + arrow, or dragged and dropped twice in a row — goes out as ONE
 * save, `RACK_ORDER_SAVE_DELAY_MS` after the last move. At most one save is ever on its way; a move
 * made while one is travelling waits for it to land, then the newest order goes straight out. When
 * a save fails, the saver says so and hands back the last order that did save (or the order the
 * rack started with, which may be none — the automatic order), so the rack can put the board back
 * where it was and show `Couldn't save the new order — try again.`
 *
 * `flush()` sends a waiting order at once — the rack calls it when the rack goes away, and before
 * Rename, Duplicate and Delete (each of which re-reads the order from the account), where it then
 * waits for `settled()`: a waiting order only goes out once the save already on its way lands, so
 * sending alone would let the action run between the two and store an order that is not the one on
 * screen (code review WR-01).
 *
 * Pure, with injected timers, like `createPreferenceWriteQueue` in `lib/preference-handoff.ts`. That
 * queue retries quietly and has no failure callback, which the rack needs, so it is not reused.
 * No React, browser API or database import.
 */

/** How long the saver waits after the last move before saving the order. */
export const RACK_ORDER_SAVE_DELAY_MS = 400;

export interface RackOrderSaverDeps {
  /** The Server Action call itself, or a fake promise-returning function in tests. */
  save(ids: string[]): Promise<void>;
  /** `setTimeout` in production, a fake recording scheduler in tests. */
  setTimer(callback: () => void, delayMs: number): unknown;
  /** `clearTimeout` in production, paired with whatever handle `setTimer` returned. */
  clearTimer(handle: unknown): void;
  /** Called with each order once it has landed on the account. */
  onSaved?(ids: readonly string[]): void;
  /** Called when a save fails, with the last order that did save — or the starting order, which
   * may be `null` (never arranged, the automatic order) — so the rack can put the board back. */
  onFailed(revertTo: readonly string[] | null): void;
  /** Called each time `pending()` changes — true once an order is waiting or on its way, false once
   * nothing is (after a save lands or fails). The rack keeps the order it shows while this is true,
   * whatever order the page's refresh hands it (`lib/models/rack-order-sync.ts`). */
  onPendingChange?(pending: boolean): void;
  /** Overrides `RACK_ORDER_SAVE_DELAY_MS`. */
  delayMs?: number;
}

export interface RackOrderSaver {
  /** Records `ids` as the order the account should hold and (re)starts the wait. An order equal to
   * the one already saved (or on its way) cancels any waiting save instead. Never throws. */
  request(ids: readonly string[]): void;
  /** Sends a waiting order now instead of after the wait (or straight after the save in flight). */
  flush(): void;
  /** Resolves once nothing is waiting and nothing is on its way — after the last save lands or
   * fails (never rejects), or at once when the saver is already idle. A waiting order still on its
   * wait keeps it unresolved: call `flush()` first. */
  settled(): Promise<void>;
  /** The rack is going away: no callback runs after this, even when a save already on its way
   * settles. A waiting order is never dropped — it goes out at once, or straight after the save
   * already on its way lands (or fails: with no rack left to put the board back, the shaper's newest
   * order is still tried). */
  dispose(): void;
  /** True while an order is waiting to be sent or a save is on its way. */
  pending(): boolean;
}

function sameIds(a: readonly string[], b: readonly string[] | null): boolean {
  if (b === null || a.length !== b.length) return false;
  return a.every((id, i) => id === b[i]);
}

export function createRackOrderSaver(lastSaved: readonly string[] | null, deps: RackOrderSaverDeps): RackOrderSaver {
  const { save, setTimer, clearTimer, onSaved, onFailed } = deps;
  const delayMs = deps.delayMs ?? RACK_ORDER_SAVE_DELAY_MS;

  let saved: readonly string[] | null = lastSaved === null ? null : [...lastSaved];
  let waiting: string[] | null = null;
  let inFlight: string[] | null = null;
  let timer: unknown = null;
  let disposed = false;
  /** The last `pending()` value handed to `onPendingChange`. */
  let reportedPending = false;

  function isPending() {
    return waiting !== null || inFlight !== null;
  }

  /** Everyone waiting on `settled()`. */
  let settleWaiters: (() => void)[] = [];

  /** After every change of state: tells `onPendingChange` when `pending()` has changed since it was
   * last told (never after `dispose`), and lets everyone waiting on `settled()` go once idle. */
  function afterChange() {
    const now = isPending();
    if (!now && settleWaiters.length > 0) {
      const waiters = settleWaiters;
      settleWaiters = [];
      for (const resolve of waiters) resolve();
    }
    if (disposed || now === reportedPending) return;
    reportedPending = now;
    deps.onPendingChange?.(now);
  }

  function clearWait() {
    if (timer !== null) {
      clearTimer(timer);
      timer = null;
    }
  }

  function send(ids: string[]) {
    waiting = null;
    inFlight = ids;
    let attempt: Promise<void>;
    try {
      attempt = save([...ids]);
    } catch (error) {
      attempt = Promise.reject(error);
    }
    attempt.then(
      () => {
        inFlight = null;
        saved = ids;
        if (!disposed) onSaved?.(ids);
        if (waiting !== null) {
          clearWait();
          if (sameIds(waiting, saved)) waiting = null;
          else send(waiting);
        }
        afterChange();
      },
      () => {
        inFlight = null;
        if (disposed) {
          // No rack is left to put the board back or say so: the shaper's newest order is still tried.
          if (waiting !== null) send(waiting);
        } else {
          clearWait();
          waiting = null;
          onFailed(saved);
        }
        afterChange();
      },
    );
  }

  function sendIfIdle() {
    if (waiting !== null && inFlight === null) send(waiting);
  }

  return {
    request(ids) {
      if (disposed) return;
      const next = [...ids];
      clearWait();
      if (sameIds(next, inFlight ?? saved)) {
        waiting = null;
        afterChange();
        return;
      }
      waiting = next;
      timer = setTimer(() => {
        timer = null;
        sendIfIdle();
      }, delayMs);
      afterChange();
    },
    flush() {
      if (disposed) return;
      clearWait();
      sendIfIdle();
    },
    settled() {
      if (!isPending()) return Promise.resolve();
      return new Promise<void>((resolve) => {
        settleWaiters.push(resolve);
      });
    },
    dispose() {
      if (disposed) return;
      disposed = true;
      clearWait();
      // A waiting order is never dropped (code review WR-01): it goes out now, or — with a save
      // already on its way — straight after that one lands, from the branches above.
      sendIfIdle();
    },
    pending() {
      return isPending();
    },
  };
}
