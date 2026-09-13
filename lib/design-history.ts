/**
 * The rules for taking a design change back and putting it forward again — Rule 1's discipline
 * (pure, tested, no React) applied to behaviour instead of geometry. This file decides three
 * separate things, each provable without a browser:
 *
 * 1. The undo/redo stacks themselves — `DesignHistory<T>`, generic over whatever snapshot shape
 *    the caller hands it, because this module has no idea what a board is and should never need
 *    to. Nothing here is ever written to a database; it is this session's memory only.
 * 2. WHEN one movement collapses into one step. A slider fires an update per pixel and a dragged
 *    point fires one per pointer move — dozens for a single drag. `recordEdit`'s coalescing rule
 *    is what turns all of that into a single undo entry: an edit folds into the one before it
 *    when it carries the same named key and lands within `COALESCE_WINDOW_MS` of the last one
 *    under that key, and the window restarts on every fold so a long, unbroken drag never grows
 *    past one step no matter how long it runs.
 * 3. The keyboard shortcut and the typed-field guard, as pure decisions over a plain event shape
 *    rather than a real `KeyboardEvent` — so both are as easy to prove in Vitest's node
 *    environment as the stacks are.
 *
 * `at` is always a timestamp the CALLER passes in, never `Date.now()` read from inside this file.
 * That is what makes the coalescing rule provable with controlled timestamps rather than left to
 * chance in a test that has to actually wait around.
 */

/**
 * How many steps the history holds before it starts forgetting the oldest one. Each entry is a
 * handful of small plain objects — a few kilobytes — so fifty of them is a rounding error against
 * the page the browser is already holding open. It is also far more than anyone works back
 * through by hand in one sitting: this cap exists so an hour of slider work cannot grow a
 * browser tab without bound, not to ration how many times a shaper can press Cmd+Z.
 */
export const HISTORY_LIMIT = 50;

/**
 * How long a pause has to be before a second edit under the same key is treated as a NEW step
 * rather than a continuation of the last one. A pointer drag and a slider drag both emit moves
 * well under 16ms apart, so anything under about a quarter of a second of stillness is plainly
 * one continuous movement. Half a second sits comfortably above the longest gap a real drag
 * leaves and comfortably below the pause that means "I finished that and started something else".
 */
export const COALESCE_WINDOW_MS = 500;

/**
 * One session's worth of undo/redo. `past` and `future` are both stacks with the most recent
 * entry at the END (so the next undo/redo is always `array[array.length - 1]`).
 *
 * `lastKey`/`lastAt` remember what the most recently RECORDED edit was and when, so the next
 * `recordEdit` call can decide whether to fold into it. `lastKey` is reset to `null` by `undo`
 * and `redo` (never left pointing at whatever was recorded before), which is what stops an edit
 * made right after an undo from folding onto the entry the undo just left behind.
 */
export interface DesignHistory<T> {
  past: T[];
  future: T[];
  lastKey: string | null;
  lastAt: number;
}

/** A fresh history: nothing to undo, nothing to redo. */
export function emptyHistory<T>(): DesignHistory<T> {
  return { past: [], future: [], lastKey: null, lastAt: 0 };
}

export function canUndo<T>(history: DesignHistory<T>): boolean {
  return history.past.length > 0;
}

export function canRedo<T>(history: DesignHistory<T>): boolean {
  return history.future.length > 0;
}

/**
 * Records that an edit happened, given the snapshot from BEFORE it (`before`), a coalescing
 * `key` naming what was touched (or `null` for an edit that must never fold with anything), and
 * `at`, the timestamp of this edit.
 *
 * Folds into the previous entry — `past` stays exactly as it is, since its top already holds the
 * state from before the whole gesture began, and only `lastAt` moves forward — when ALL of:
 * `key` is non-null, `key` equals `history.lastKey`, `at - history.lastAt` is at most
 * `COALESCE_WINDOW_MS`, and `past` is non-empty. A `null` key can never satisfy this (by design:
 * a discrete flip like a toggle must never fold with anything, including another flip of the
 * same toggle), which is also why a `null`-key edit leaves `lastKey` as `null` afterwards and so
 * blocks the very next edit — of any key — from folding onto it.
 *
 * Otherwise it pushes `before` onto `past`, drops from the FRONT if that now exceeds
 * `HISTORY_LIMIT` (the oldest step goes, never the newest), and records `key`/`at` as the new
 * `lastKey`/`lastAt`. Either way, a fresh edit always clears `future` — redo only ever points
 * forward into a board that still exists.
 */
export function recordEdit<T>(history: DesignHistory<T>, before: T, key: string | null, at: number): DesignHistory<T> {
  const canFold =
    key !== null && key === history.lastKey && history.past.length > 0 && at - history.lastAt <= COALESCE_WINDOW_MS;

  if (canFold) {
    return { ...history, future: [], lastAt: at };
  }

  const pushed = [...history.past, before];
  const past = pushed.length > HISTORY_LIMIT ? pushed.slice(pushed.length - HISTORY_LIMIT) : pushed;

  return { past, future: [], lastKey: key, lastAt: at };
}

/** What `undo`/`redo` hand back: the next history, and the snapshot the caller should apply. */
export interface HistoryStep<T> {
  history: DesignHistory<T>;
  restored: T;
}

/**
 * Steps one entry back. Returns `null` on an empty past rather than a silent no-op that would
 * look like success to a caller who forgot to check — there is nothing to undo, and the caller
 * needs to know that, not receive an unchanged history and assume it worked.
 *
 * `current` (the board as it stands right now, before the undo) moves onto `future` so `redo` can
 * put it back. `lastKey` is reset to `null` — an undo is not itself an edit that can be folded
 * into, and nothing recorded afterwards should fold onto what it left behind either.
 */
export function undo<T>(history: DesignHistory<T>, current: T): HistoryStep<T> | null {
  if (history.past.length === 0) return null;
  const restored = history.past[history.past.length - 1];
  const past = history.past.slice(0, -1);
  const future = [...history.future, current];
  return { history: { past, future, lastKey: null, lastAt: history.lastAt }, restored };
}

/** The mirror of `undo` — steps one entry forward, or returns `null` on an empty future. */
export function redo<T>(history: DesignHistory<T>, current: T): HistoryStep<T> | null {
  if (history.future.length === 0) return null;
  const restored = history.future[history.future.length - 1];
  const future = history.future.slice(0, -1);
  const past = [...history.past, current];
  return { history: { past, future, lastKey: null, lastAt: history.lastAt }, restored };
}

/** The plain shape `undoShortcut` and `isTextEntryTarget` read, instead of a real DOM event —
 * both run in Vitest's node environment with no DOM available. */
export interface KeyboardShortcutInput {
  key: string;
  metaKey: boolean;
  ctrlKey: boolean;
  shiftKey: boolean;
  altKey: boolean;
}

/**
 * Reads a keydown as "undo", "redo", or neither. Cmd+Z (Mac) and Ctrl+Z (Windows/Linux) both mean
 * undo; adding Shift means redo — the near-universal convention, so this needs no discovery UI.
 * A browser reports an upper-case `"Z"` when Shift is held, so the key is lower-cased before
 * comparison. Alt held at the same time is rejected outright: that combination belongs to other
 * browser/OS shortcuts, not this one.
 */
export function undoShortcut(event: KeyboardShortcutInput): "undo" | "redo" | null {
  if (event.altKey) return null;
  if (!(event.metaKey || event.ctrlKey)) return null;
  if (event.key.toLowerCase() !== "z") return null;
  return event.shiftKey ? "redo" : "undo";
}

/** The plain shape `isTextEntryTarget` reads in place of a real `EventTarget`. */
export interface TextEntryTargetInput {
  tagName?: string | null;
  type?: string | null;
  isContentEditable?: boolean;
}

/**
 * `<input>` types that are NOT text entry, so the undo shortcut must NOT be suppressed for them.
 * The one that matters most: `range`. Base UI renders a slider's thumb as a real, focused
 * `<input type="range">`, so a guard that blocked the shortcut whenever any `<input>` was focused
 * would silently kill Cmd+Z immediately after every slider move — exactly the moment a shaper is
 * most likely to want it. Checkbox, radio, button, submit, reset, color and file are included for
 * the same reason: none of them are a place a shaper is typing text the browser's own undo owns.
 */
const NON_TEXT_INPUT_TYPES = new Set([
  "range",
  "checkbox",
  "radio",
  "button",
  "submit",
  "reset",
  "color",
  "file",
]);

/**
 * Whether the keyboard shortcut should leave this element alone because it is where a shaper is
 * typing text — a `<textarea>`, anything `contenteditable`, or an `<input>` whose type is a text
 * entry type (including no type at all, which defaults to text). Cmd+Z there is the BROWSER's
 * own text undo; stepping on it would mean backing out a mistyped digit also silently undoes the
 * last thing shaped on the board. A `<select>` is deliberately not blocked here — Cmd+Z does
 * nothing native on one, so there is no browser undo to defer to.
 */
export function isTextEntryTarget(target: TextEntryTargetInput | null): boolean {
  if (!target) return false;
  if (target.isContentEditable) return true;

  const tagName = target.tagName?.toLowerCase();
  if (tagName === "textarea") return true;
  if (tagName === "input") return !NON_TEXT_INPUT_TYPES.has((target.type ?? "text").toLowerCase());
  return false;
}
