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
