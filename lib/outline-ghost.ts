/**
 * TEMPLATE's last-edit ghost (quick task 260930-lia, Phase 13 optional item 9b): the rule that
 * picks which past outline, if any, should be drawn faintly behind the live board so a shaper can
 * compare an edit against what came just before it.
 *
 * The rule, in plain words (O-1): search this session's undo history from its most recent entry
 * backward, and the ghost is the first one whose outline is actually DIFFERENT from what is on
 * screen right now. An edit made somewhere else (a rocker, rail or fin change) records a history
 * step whose outline is identical to the live one — that step is skipped, so a reference the
 * shaper set up on TEMPLATE survives a detour to another screen. If every step in the history
 * matches the live outline — or there is no history at all, on a board nobody has edited yet —
 * there is no ghost.
 *
 * This is also exactly what makes Undo and Redo do the right thing with no extra code: after an
 * Undo the board itself has moved back one step, and this same rule, run again over whatever
 * `past` now is, finds the NEXT differing entry below that — the shape one further step back. The
 * redo stack (`future`) is never read by this file at all: it has no parameter for it, so a board
 * that has been undone can never leak back in as somebody's "last edit" ghost.
 *
 * Not in `lib/geometry/`: nothing here is a shaping formula. This is a rule about the EDIT
 * HISTORY — which of several past snapshots to show — layered on top of `lib/design-history.ts`,
 * which is deliberately generic and knows nothing about boards or outlines at all.
 */

import type { OutlineSpec } from "./geometry/board";

/** Plain recursive structural equality over JSON-shaped data: primitives by `===`, arrays by
 * length and element, objects by their own key sets (key order ignored) with every value equal.
 * Private — `outlinesMatch` below is the one typed, exported entry point, since `OutlineSpec`'s
 * own shape (numbers, and one nested `TailShape` union) is the only value shape this ever needs
 * to compare. */
function deepEqual(a: unknown, b: unknown): boolean {
  if (a === b) return true;
  if (typeof a !== "object" || typeof b !== "object" || a === null || b === null) return false;

  if (Array.isArray(a) || Array.isArray(b)) {
    if (!Array.isArray(a) || !Array.isArray(b)) return false;
    if (a.length !== b.length) return false;
    return a.every((value, index) => deepEqual(value, b[index]));
  }

  const aKeys = Object.keys(a as Record<string, unknown>);
  const bKeys = Object.keys(b as Record<string, unknown>);
  if (aKeys.length !== bKeys.length) return false;
  return aKeys.every((key) =>
    Object.prototype.hasOwnProperty.call(b, key) &&
    deepEqual((a as Record<string, unknown>)[key], (b as Record<string, unknown>)[key]),
  );
}

/** Whether two outlines describe the same board — same field values, key order ignored, every
 * field compared including the nested `tail`, so a field added to `OutlineSpec` later is compared
 * automatically without this file needing an update. */
export function outlinesMatch(a: OutlineSpec, b: OutlineSpec): boolean {
  return deepEqual(a, b);
}

/**
 * The O-1 rule itself. Walks `past` from its last index (the most recently recorded step) down to
 * its first, and returns the first entry's own `outline` object (never a copy) for which
 * `outlinesMatch` against `live` is false. Returns `null` when nothing differs — including an
 * empty `past`.
 *
 * Generic over the caller's own history-entry shape (matching `DesignHistorySnapshot` in
 * `components/design/design-store.tsx`, which is an object with an `outline` field among others)
 * rather than importing that type here, keeping this module dependency-free apart from
 * `OutlineSpec` itself.
 *
 * Returning the entry's OWN outline object, not a copy, is what lets the store's ghost-geometry
 * memo stay the same object for the whole of a drag — `buildOutline` runs once per new ghost,
 * never once per frame.
 *
 * Takes no `future` parameter at all, so the redo stack can never feed it — see this file's own
 * header comment for why that is exactly what makes Undo/Redo correct for free.
 */
export function pickOutlineGhost<T extends { outline: OutlineSpec }>(
  past: readonly T[],
  live: OutlineSpec,
): OutlineSpec | null {
  for (let i = past.length - 1; i >= 0; i--) {
    const candidate = past[i]!.outline;
    if (!outlinesMatch(candidate, live)) return candidate;
  }
  return null;
}
