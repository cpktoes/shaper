/**
 * The seed's rules for taking a blank out of the online blank list (quick task 261002-aqu): which
 * stored blanks have left the catalogue files, and when the seed is allowed to remove them.
 *
 * A blank leaves the files when it is renamed or withdrawn. The seed script only ever adds and
 * updates on a plain run, so a renamed blank would sit in the table beside its new name for good.
 * The `--prune` option removes such a blank — and only when asked, only when both its maker and its
 * name are missing from the files, and never when the files look mis-read (empty, or far more
 * blanks than a rename or a withdrawal could explain). The script holds the one removal statement;
 * this file holds the decisions, so they can be tested without a database.
 *
 * No React, browser, database or Node import.
 */

/** A blank's identity: its maker and its name together. Neither means anything alone. */
export type BlankKey = { vendor: string; name: string };

/**
 * The most blanks one `--prune` run may remove. A rename or a withdrawal moves one or two blanks;
 * more than five in one run means the catalogue files were mis-read, so the seed refuses rather
 * than empty the table.
 */
export const MAX_BLANKS_REMOVED_PER_RUN = 5;

/** What the seed was asked to do, or why it refuses before touching anything. */
export type SeedOptions =
  | { status: "ok"; check: boolean; prune: boolean }
  | { status: "refused"; reason: string };

/**
 * Reads the seed's command-line arguments. Only the exact words `--check` and `--prune` mean
 * anything; every other argument is ignored, as it always was. `--check` never writes, so it is
 * refused when combined with `--prune`.
 */
export function readSeedOptions(args: readonly string[]): SeedOptions {
  const check = args.includes("--check");
  const prune = args.includes("--prune");
  if (check && prune) {
    return {
      status: "refused",
      reason:
        "--check only reads and never removes anything, so it can't be combined with --prune: run the seed with --prune first, then --check on its own",
    };
  }
  return { status: "ok", check, prune };
}

/**
 * The stored blanks whose maker and name are not both in the catalogue, each once, as a fresh
 * `{ vendor, name }`, sorted by maker and then name in plain code-unit order so the printed lines
 * read the same on every run. Maker and name are matched as a pair, exactly — never joined into
 * one string, never case-folded or trimmed. With an empty catalogue every stored blank is stale;
 * refusing to act on that is `planBlankRemoval`'s job, not this function's.
 */
export function staleBlanks(stored: readonly BlankKey[], catalogue: readonly BlankKey[]): BlankKey[] {
  const known = new Map<string, Set<string>>();
  for (const { vendor, name } of catalogue) {
    const names = known.get(vendor);
    if (names) names.add(name);
    else known.set(vendor, new Set([name]));
  }

  const seen = new Map<string, Set<string>>();
  const stale: BlankKey[] = [];
  for (const { vendor, name } of stored) {
    if (known.get(vendor)?.has(name)) continue;
    const already = seen.get(vendor);
    if (already?.has(name)) continue;
    if (already) already.add(name);
    else seen.set(vendor, new Set([name]));
    stale.push({ vendor, name });
  }

  return stale.sort((a, b) =>
    a.vendor < b.vendor ? -1 : a.vendor > b.vendor ? 1 : a.name < b.name ? -1 : a.name > b.name ? 1 : 0,
  );
}

/** Whether the seed may remove blanks, and which ones. */
export type BlankRemovalPlan =
  | { status: "remove"; blanks: BlankKey[] }
  | { status: "refused"; reason: string };

/**
 * Decides what a `--prune` run may remove. It refuses, removing nothing, when the catalogue gave no
 * blanks at all (every stored blank would look out of date) and when more than
 * `MAX_BLANKS_REMOVED_PER_RUN` blanks would go. Otherwise it returns the stale blanks, which may be
 * none.
 */
export function planBlankRemoval(stored: readonly BlankKey[], catalogue: readonly BlankKey[]): BlankRemovalPlan {
  if (catalogue.length === 0) {
    return {
      status: "refused",
      reason:
        "Refusing to remove any blank: the catalogue files gave no blanks at all, so every blank in the table would look out of date — nothing was removed",
    };
  }
  const stale = staleBlanks(stored, catalogue);
  if (stale.length > MAX_BLANKS_REMOVED_PER_RUN) {
    return {
      status: "refused",
      reason: `Refusing to remove any blank: ${stale.length} blanks in the table are not in the catalogue files, and one run may remove at most ${MAX_BLANKS_REMOVED_PER_RUN} — check the catalogue files were read correctly; nothing was removed`,
    };
  }
  return { status: "remove", blanks: stale };
}
