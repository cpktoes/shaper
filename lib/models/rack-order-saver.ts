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
 * `flush()` sends a waiting order at once — the rack calls it before Rename, Duplicate and Delete
 * (each of which re-reads the order from the account) and when the rack goes away.
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
  /** Overrides `RACK_ORDER_SAVE_DELAY_MS`. */
  delayMs?: number;
}

export interface RackOrderSaver {
  /** Records `ids` as the order the account should hold and (re)starts the wait. An order equal to
   * the one already saved (or on its way) cancels any waiting save instead. Never throws. */
  request(ids: readonly string[]): void;
  /** Sends a waiting order now instead of after the wait (or straight after the save in flight). */
  flush(): void;
  /** Cancels the wait and drops any waiting order; no callback runs after this, even when a save
   * already on its way settles. Call `flush()` first to keep a waiting order. */
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
        if (disposed) return;
        inFlight = null;
        saved = ids;
        onSaved?.(ids);
        if (waiting !== null) {
          clearWait();
          if (sameIds(waiting, saved)) waiting = null;
          else send(waiting);
        }
      },
      () => {
        if (disposed) return;
        inFlight = null;
        clearWait();
        waiting = null;
        onFailed(saved);
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
        return;
      }
      waiting = next;
      timer = setTimer(() => {
        timer = null;
        sendIfIdle();
      }, delayMs);
    },
    flush() {
      if (disposed) return;
      clearWait();
      sendIfIdle();
    },
    dispose() {
      disposed = true;
      clearWait();
      waiting = null;
    },
    pending() {
      return waiting !== null || inFlight !== null;
    },
  };
}
