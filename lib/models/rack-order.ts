/**
 * The board rack's ordering rule (D-06, D-07).
 *
 * Two rules matter more than any other formatting or layout decision on the rack:
 *
 * 1. The board a shaper is part-way through — unsaved — is always first. There is exactly one
 *    place to look for every board they have, and that place always starts with the one in
 *    their hands right now (D-07).
 * 2. Ties fall back to row id, deterministically, so the rack never rearranges itself under a
 *    shaper's cursor between two renders of the same underlying data. Two boards saved in the
 *    same second (or a clock that hasn't ticked between two edits) must still come out in the
 *    same order every time this function is called.
 *
 * Phase 15 (the Board Rack) adds the shaper's own order (D-01 to D-03, D-16). A stored order is a list
 * of saved board ids; `null` means the shaper has never arranged the rack, and the rack keeps the
 * automatic order above until they first move a board (D-03) or first duplicate one (D-16). The
 * unsaved board is never in the list — it has no id — so it can never be moved or passed (R9).
 *
 * Pure TypeScript — no React, browser API or database import — so this ordering can be verified
 * in isolation from the component that renders it, exactly like every module under
 * lib/geometry/.
 */

/** The single unsaved board in progress, if any. Carries no identity of its own — there is at
 * most one, and it always sorts first regardless of where it appears in the input. */
export interface InProgressRackEntry {
  kind: "in-progress";
}

/** One saved row (a `models` table entry). `id` is the entry's true identity — two entries with
 * the same `name` or the same `updatedAt` are still two separate boards; nothing merges on
 * anything but `id`. */
export interface SavedRackEntry {
  kind: "saved";
  id: string;
  name: string;
  updatedAt: Date;
}

export type RackEntry = InProgressRackEntry | SavedRackEntry;

/**
 * Orders a list of rack entries: the in-progress entry (if present) first, then saved entries
 * most-recently-touched first, with `id` (descending) breaking an exact `updatedAt` tie so the
 * order is stable across repeated calls on the same input.
 *
 * Generic over `T extends RackEntry` so a caller can sort richer objects (e.g. a saved entry
 * carrying the full `SavedModel` alongside `id`/`name`/`updatedAt`) without losing those extra
 * fields through the sort.
 *
 * Sorts a copy — the input array (and its elements) are never mutated, because a caller may be
 * handing this a Server Component's own props array.
 */
export function sortRackEntries<T extends RackEntry>(entries: readonly T[]): T[] {
  const copy = [...entries];
  copy.sort((a, b) => {
    if (a.kind === "in-progress") return b.kind === "in-progress" ? 0 : -1;
    if (b.kind === "in-progress") return 1;

    const byUpdatedAt = b.updatedAt.getTime() - a.updatedAt.getTime();
    if (byUpdatedAt !== 0) return byUpdatedAt;

    // Deterministic tiebreak — descending id — so two entries with identical updatedAt values
    // (or names) never merge and never reorder between calls.
    if (a.id === b.id) return 0;
    return a.id > b.id ? -1 : 1;
  });
  return copy;
}

// ---------------------------------------------------------------------------------------------
// Phase 15 — the shaper's own order.
// ---------------------------------------------------------------------------------------------

/** The key the unsaved board goes by on the rack. A saved board's key is its id; the unsaved board
 * has no id, so it gets this fixed key — never a database id, so it can never collide with one. */
export const IN_PROGRESS_KEY = "in-progress";

/** One rack entry's key: the saved board's id, or `IN_PROGRESS_KEY` for the unsaved board. */
export function rackEntryKey(entry: RackEntry): string {
  return entry.kind === "saved" ? entry.id : IN_PROGRESS_KEY;
}

/**
 * The order the rack shows (D-01, D-03, R9) — the only place the order rule lives; components
 * render what this returns.
 *
 * - No stored list (`null`): today's automatic order, exactly `sortRackEntries` (D-03).
 * - A stored list: the unsaved board first (R9); then any saved board the list doesn't name,
 *   newest-touched first, so a board saved after the last arrangement stands first (D-01's
 *   fallback); then the listed boards in the list's order. A listed board's `updatedAt` is
 *   ignored, so editing a board never moves it.
 *
 * The stored list is read leniently, so a list written by another device can never break the rack:
 * an id with no board (deleted, or never this shaper's) is skipped and a repeated id counts once.
 * Generic over `T`, so a caller's richer entries come back as the same objects. Never mutates.
 */
export function applyStoredOrder<T extends RackEntry>(entries: readonly T[], storedOrder: readonly string[] | null): T[] {
  if (storedOrder === null) return sortRackEntries(entries);

  const inProgress = entries.filter((e) => e.kind === "in-progress");
  const saved = entries.filter((e): e is T & SavedRackEntry => e.kind === "saved");
  const byId = new Map(saved.map((e) => [e.id, e] as const));
  const listed: T[] = [];
  const seen = new Set<string>();
  for (const id of storedOrder) {
    const entry = byId.get(id);
    if (entry !== undefined && !seen.has(id)) {
      listed.push(entry);
      seen.add(id);
    }
  }
  const unlisted = sortRackEntries(saved.filter((e) => !seen.has(e.id)));
  return [...inProgress, ...unlisted, ...listed];
}

/** The saved boards' ids in the order given — the unsaved board left out, since it has no id and
 * is never part of a stored list (R9). */
export function savedIdsInOrder(entries: readonly RackEntry[]): string[] {
  const ids: string[] = [];
  for (const entry of entries) if (entry.kind === "saved") ids.push(entry.id);
  return ids;
}

/**
 * Moves one board to `toIndex` — its index in the list that results, clamped to the list's ends.
 * A board not in the list returns an unchanged copy. Works on saved ids only; the caller turns a
 * place on the rack into a saved place with `rackIndexToSavedIndex`.
 */
export function moveInOrder(ids: readonly string[], id: string, toIndex: number): string[] {
  if (!ids.includes(id)) return [...ids];
  const rest = ids.filter((other) => other !== id);
  const at = Math.min(Math.max(0, Math.trunc(toIndex)), rest.length);
  rest.splice(at, 0, id);
  return rest;
}

/**
 * Moves one board one place left (`-1`) or right (`1`) — the ⋯ menu's Move left / Move right and
 * Alt + arrow. Says what happened, so the rack can show "already first" / "already last": a board
 * at the end it was pushed towards stays put, and a board not in the list is `missing`.
 */
export function moveOneStep(
  ids: readonly string[],
  id: string,
  direction: -1 | 1,
): { ids: string[]; outcome: "moved" | "first" | "last" | "missing" } {
  const index = ids.indexOf(id);
  if (index === -1) return { ids: [...ids], outcome: "missing" };
  if (direction === -1 && index === 0) return { ids: [...ids], outcome: "first" };
  if (direction === 1 && index === ids.length - 1) return { ids: [...ids], outcome: "last" };
  return { ids: moveInOrder(ids, id, index + direction), outcome: "moved" };
}

/** Puts a board at the front of the list (D-01), removing any earlier copy of its id first. */
export function insertFirst(ids: readonly string[], id: string): string[] {
  return [id, ...ids.filter((other) => other !== id)];
}

/**
 * Puts a board straight after another (D-02), removing any earlier copy of its id first. When the
 * board it should follow is not in the list, it goes first instead.
 */
export function insertAfter(ids: readonly string[], afterId: string, id: string): string[] {
  const rest = ids.filter((other) => other !== id);
  const at = rest.indexOf(afterId);
  if (at === -1) return [id, ...rest];
  rest.splice(at + 1, 0, id);
  return rest;
}

/**
 * The list a duplicate stores (D-02, D-16): the rack's whole displayed order — automatic when
 * nothing is stored yet — with the copy straight after its original. Duplicating fixes the order
 * even in a rack never arranged (D-16), so the copy stays beside its original from then on.
 * `savedEntries` may already include the copy; it is moved into place, never repeated.
 */
export function orderAfterDuplicate(
  savedEntries: readonly SavedRackEntry[],
  stored: readonly string[] | null,
  originalId: string,
  copyId: string,
): string[] {
  return insertAfter(savedIdsInOrder(applyStoredOrder(savedEntries, stored)), originalId, copyId);
}

/**
 * The list a newly saved board stores in a rack the shaper has arranged (D-01): the rack's whole
 * displayed order with the new board at the front, so it stands right where the unsaved board
 * stood. Only called when a list is stored — with none, the automatic order already puts the
 * newest board first.
 */
export function orderWithNewBoardFirst(
  savedEntries: readonly SavedRackEntry[],
  stored: readonly string[],
  newId: string,
): string[] {
  return insertFirst(savedIdsInOrder(applyStoredOrder(savedEntries, stored)), newId);
}

/**
 * Turns a place on the rack into a place in the saved-id list (R9). With the unsaved board pinned
 * first, rack place 1 is saved place 0 — and rack place 0 is also saved place 0, the first place
 * behind the unsaved board — so nothing can ever land in front of it.
 */
export function rackIndexToSavedIndex(rackIndex: number, pinnedFirst: boolean): number {
  return Math.max(0, rackIndex - (pinnedFirst ? 1 : 0));
}
